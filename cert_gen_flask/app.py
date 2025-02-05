import colorsys
import webcolors
from flask import Flask, request, jsonify
from PIL import Image, ImageDraw, ImageFont
from flask_cors import CORS
import re
import os
import io
import time
import urllib.request
import shutil

import firebase_admin
from firebase_admin import credentials, firestore
import cloudinary
import cloudinary.uploader
import cloudinary.api
from cloudinary.utils import cloudinary_url
import requests
from io import BytesIO
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure Cloudinary with loaded environment variables
cloudinary.config(
    cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key = os.getenv('CLOUDINARY_API_KEY'),
    api_secret = os.getenv('CLOUDINARY_API_SECRET')
)

# Add this right after cloudinary.config() to debug environment variables
print("Cloudinary Environment Variables:")
print(f"CLOUDINARY_CLOUD_NAME: {os.getenv('CLOUDINARY_CLOUD_NAME')}")
print(f"CLOUDINARY_API_KEY exists: {bool(os.getenv('CLOUDINARY_API_KEY'))}")
print(f"CLOUDINARY_API_SECRET exists: {bool(os.getenv('CLOUDINARY_API_SECRET'))}")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}})

# Firebase Admin SDK initialization
cred = credentials.Certificate("central-app-735d2-firebase-adminsdk-tjvv7-f480680963.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

def convert_color(color_input):
    """
    Convert color input to RGB format.

    Args:
        color_input (str or list): The color input, which can be in RGB, HSL, or HEX format.

    Returns:
        tuple: RGB color as a tuple of integers.
    """
    if isinstance(color_input, list):  # RGB
        if len(color_input) == 3:
            return tuple(color_input)
        else:
            raise ValueError("RGB color must be a list of 3 values.")
    
    elif isinstance(color_input, str):  # HEX or HSL
        if color_input.startswith("#"):  # HEX color
            try:
                return webcolors.hex_to_rgb(color_input)
            except ValueError:
                raise ValueError(f"Invalid HEX color format: {color_input}")
        
        # Check if it's HSL format
        if color_input.startswith("hsl"):
            # Use regex to extract values from hsl(x, y%, z%)
            match = re.match(r"hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)", color_input.strip())
            if match:
                h = int(match.group(1))  # Hue
                s = int(match.group(2)) / 100  # Saturation
                l = int(match.group(3)) / 100  # Lightness
                r, g, b = colorsys.hls_to_rgb(h / 360, l, s)  # Convert HSL to RGB
                return (int(r * 255), int(g * 255), int(b * 255))
            else:
                raise ValueError(f"Invalid HSL color format: {color_input}")
        
    raise ValueError("Unsupported color format")

def generate_certificate(name, font_path, font_size, template_path, text_position, text_color, output_path):
    """
    Generate a certificate with custom text and font, and save the generated image to the specified output path.

    Args:
        name (str): Name to overlay on the certificate.
        font_path (str): Path to the .ttf font file.
        font_size (int): Font size for the text.
        template_path (str): Path to the certificate template image.
        text_position (tuple): Coordinates (x, y) for the text on the certificate.
        text_color (tuple): Text color in RGB format.
        output_path (str): Path to save the generated certificate.
    """
    # Load the certificate template
    template = Image.open(template_path)
    draw = ImageDraw.Draw(template)
    
    # Load the TTF font
    try:
        font = ImageFont.truetype(font_path, font_size)
    except IOError:
        raise FileNotFoundError(f"Font file not found: {font_path}")
    
    # Add text to the certificate
    draw.text(text_position, name, fill=text_color, font=font)
    
    # Save the generated certificate to the specified output path
    template.save(output_path)
    print(f"Certificate saved to {output_path}")


from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from google.oauth2.service_account import Credentials
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import os
from flask import jsonify, request

def upload_to_google_drive(file_stream, file_name, folder_id):
    """
    Upload a file to Google Drive from an in-memory file stream.

    Args:
        file_stream (BytesIO): In-memory file stream containing the file data.
        file_name (str): The name of the file.
        folder_id (str): Google Drive folder ID where the file will be uploaded.

    Returns:
        str: Link to the uploaded file on Google Drive.
    """
    # Authenticate with Google Drive API
    SCOPES = ['https://www.googleapis.com/auth/drive.file']
    creds = Credentials.from_service_account_file('credentials/service.json', scopes=SCOPES)
    drive_service = build('drive', 'v3', credentials=creds)

    # File metadata
    file_metadata = {
        'name': file_name,
        'parents': [folder_id]  # Folder to upload the file into
    }

    # Upload the file directly from the in-memory stream
    media = MediaIoBaseUpload(file_stream, mimetype='image/png')
    uploaded_file = drive_service.files().create(body=file_metadata, media_body=media, fields='id').execute()

    # Generate a public link to the file
    file_id = uploaded_file.get('id')
    permission = {'type': 'anyone', 'role': 'reader'}
    drive_service.permissions().create(fileId=file_id, body=permission).execute()

    # Return the public link
    return f"https://drive.google.com/file/d/{file_id}/view"


@app.route('/api/generateCertificates', methods=['POST'])
def generate_certificates():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "Invalid data"}), 400

        # Get template from Cloudinary
        try:
            template_resource = cloudinary.api.resource('tedx-certificates/templates/template')
            template_url = template_resource['secure_url']
            print(f"Found template at: {template_url}")
            
            # Download template
            response = requests.get(template_url)
            if response.status_code != 200:
                return jsonify({
                    "message": "Failed to download template",
                    "details": f"HTTP Status: {response.status_code}"
                }), 500
            
            template = Image.open(BytesIO(response.content))
            print("Successfully loaded template from Cloudinary")
        except Exception as e:
            return jsonify({
                "message": "Template not found",
                "details": "Please upload a template first",
                "error": str(e)
            }), 404

        # Get font from Cloudinary
        try:
            # Try both ttf and otf extensions
            font_extensions = ['ttf', 'otf']
            font_url = None
            font_ext = None
            
            for ext in font_extensions:
                try:
                    font_resource = cloudinary.api.resource(
                        f'tedx-certificates/fonts/font.{ext}', 
                        resource_type='raw'
                    )
                    font_url = font_resource['secure_url']
                    font_ext = ext
                    print(f"Found font at: {font_url}")
                    break
                except Exception:
                    continue
            
            if not font_url:
                raise Exception("No font file found")
            
            # Download and save font temporarily
            font_response = requests.get(font_url)
            if font_response.status_code != 200:
                raise Exception(f"Failed to download font: HTTP {font_response.status_code}")
                
            temp_font_path = os.path.join(os.path.dirname(__file__), f'temp_font.{font_ext}')
            with open(temp_font_path, 'wb') as f:
                f.write(font_response.content)
            print(f"Font downloaded and saved temporarily as {temp_font_path}")
                
        except Exception as e:
            print(f"Error loading font: {str(e)}")
            return jsonify({
                "message": "Font not found",
                "details": "Please upload a font first",
                "error": str(e)
            }), 404

        # Get input values
        font_size = int(data.get("fontSize", 72))
        color_input = data.get("color", [0, 0, 0])
        textX = int(data.get("textX", 300))
        textY = int(data.get("textY", 400))

        try:
            color = convert_color(color_input)
        except ValueError as e:
            return jsonify({"message": f"Invalid color format: {str(e)}"}), 400

        # Retrieve participants with attended == true
        participants_ref = db.collection("participants")
        participants = participants_ref.where("attend", "==", True).get()

        if not participants:
            return jsonify({"message": "No participants found with attended == true"}), 400

        drive_links = []
        folder_id = "14EDF_vrum_g_8ofzUjCpKJzuSrmVtC2C"

        # Load font
        try:
            font = ImageFont.truetype(temp_font_path, font_size)
            print(f"Successfully loaded font with size {font_size}")
        except Exception as e:
            print(f"Error loading font, using default: {str(e)}")
            default_font = get_default_font()
            if isinstance(default_font, str):
                font = ImageFont.truetype(default_font, font_size)
            else:
                font = default_font

        # Process each participant
        for participant in participants:
            try:
                participant_data = participant.to_dict()
                name = participant_data.get("name", "").strip()
                email = participant_data.get("email", "").strip().lower()

                if not email:
                    continue
                print(f"Processing certificate for: {name}")

                # Create new image for each participant
                cert_image = template.copy()
                draw = ImageDraw.Draw(cert_image)
                draw.text((textX, textY), name, fill=color, font=font)

                # Save to BytesIO
                image_stream = BytesIO()
                cert_image.save(image_stream, format="PNG")
                image_stream.seek(0)

                # Upload to Google Drive
                link = upload_to_google_drive(image_stream, f"{name.replace(' ', '_')}.png", folder_id)
                drive_links.append({"name": name, "link": link})
                print(f"Certificate uploaded for {name}: {link}")

                # Update participant's document with the link
                participant_ref = db.collection("participants").document(participant.id)
                participant_ref.update({
                    'certgen': link
                })

            except Exception as participant_error:
                print(f"Error processing participant {name}: {str(participant_error)}")
                continue

        # Clean up temporary font file
        try:
            if os.path.exists(temp_font_path):
                os.remove(temp_font_path)
                print("Cleaned up temporary font file")
        except Exception as e:
            print(f"Warning: Could not remove temporary font file: {str(e)}")

        return jsonify({
            "message": "Certificates generated, uploaded, and links updated successfully",
            "links": drive_links
        }), 200

    except Exception as e:
        print(f"Error generating certificates: {str(e)}")
        return jsonify({
            "message": f"Error generating certificates: {str(e)}",
            "details": str(e)
        }), 500

def get_cloudinary_resource(public_id):
    """Get resource from Cloudinary"""
    try:
        print(f"Attempting to fetch resource with public_id: {public_id}")
        # First check if the resource exists
        resource = cloudinary.api.resource(public_id)
        print(f"Resource found: {resource}")
        
        # Get the URL with secure protocol
        url = cloudinary_url(public_id, format="png", secure=True)[0]
        print(f"Generated URL: {url}")
        
        response = requests.get(url)
        if response.status_code != 200:
            print(f"Failed to fetch image. Status code: {response.status_code}")
            print(f"Response content: {response.content[:200]}")  # Print first 200 chars of response
            raise Exception(f"Failed to fetch resource from Cloudinary: {response.status_code}")
            
        return Image.open(BytesIO(response.content))
    except Exception as e:
        print(f"Error in get_cloudinary_resource: {str(e)}")
        # Try without the folder structure in the error message
        template_name = public_id.split('/')[-1]
        raise Exception(
            f"Template not found in Cloudinary. Please upload a template first.\n"
            f"Full path attempted: {public_id}\n"
            f"Template name: {template_name}"
        )

def get_default_font():
    """Get a default system font path"""
    try:
        # Try to find Arial or a similar default font based on the operating system
        if os.name == 'nt':  # Windows
            font_path = 'C:\\Windows\\Fonts\\arial.ttf'
        else:  # Linux/Mac
            font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
        
        if os.path.exists(font_path):
            return font_path
            
        # If the above fails, try to use PIL's default font
        return ImageFont.load_default()
    except Exception as e:
        print(f"Error loading default font: {e}")
        return ImageFont.load_default()

@app.route('/api/generateSample', methods=['POST'])
def generate_sample_certificate():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "Invalid data"}), 400

        # First check if template exists in Cloudinary
        try:
            template_resource = cloudinary.api.resource('tedx-certificates/templates/template')
            template_url = template_resource['secure_url']
            print(f"Found template at: {template_url}")
        except Exception as e:
            return jsonify({
                "message": "Template not found",
                "details": "Please upload a template first using the upload template endpoint",
                "error": str(e)
            }), 404
            
        # Check if font exists in Cloudinary and get its format
        try:
            # Try both ttf and otf extensions
            font_extensions = ['ttf', 'otf']
            font_resource = None
            font_url = None
            
            for ext in font_extensions:
                try:
                    font_resource = cloudinary.api.resource(
                        f'tedx-certificates/fonts/font.{ext}', 
                        resource_type='raw'
                    )
                    font_url = font_resource['secure_url']
                    print(f"Found font at: {font_url}")
                    break
                except Exception:
                    continue
            
            if not font_url:
                raise Exception("No font file found in either .ttf or .otf format")
            
            # Download and save font temporarily
            font_response = requests.get(font_url)
            if font_response.status_code != 200:
                raise Exception(f"Failed to download font: HTTP {font_response.status_code}")
                
            temp_font_path = os.path.join(os.path.dirname(__file__), f'temp_font.{ext}')
            with open(temp_font_path, 'wb') as f:
                f.write(font_response.content)
            print(f"Font downloaded and saved temporarily as {temp_font_path}")
                
        except Exception as e:
            print(f"Error loading font: {str(e)}")
            return jsonify({
                "message": "Font not found",
                "details": "Please upload a font first using the upload font endpoint",
                "error": str(e)
            }), 404

        # Clear all files in the samples folder
        try:
            search_result = cloudinary.search\
                .expression('folder:tedx-certificates/samples/*')\
                .execute()
            
            if search_result.get('total_count', 0) > 0:
                for resource in search_result.get('resources', []):
                    cloudinary.uploader.destroy(
                        resource['public_id'],
                        resource_type = "image",
                        invalidate = True
                    )
                print(f"Cleared {search_result['total_count']} files from samples folder")
        except Exception as e:
            print(f"Warning: Error while clearing samples folder: {str(e)}")

        # Download template from Cloudinary
        try:
            response = requests.get(template_url)
            if response.status_code != 200:
                return jsonify({
                    "message": "Failed to download template",
                    "details": f"HTTP Status: {response.status_code}"
                }), 500
            
            template = Image.open(BytesIO(response.content))
            print("Successfully loaded template from Cloudinary")
        except Exception as e:
            return jsonify({
                "message": "Error loading template",
                "details": str(e)
            }), 500

        # Get text parameters
        name = data.get("name", "Sample Name")
        font_size = int(data.get("fontSize", 72))
        color_input = data.get("color", [0, 0, 0])
        textX = int(data.get("textX", 300))
        textY = int(data.get("textY", 400))
        
        try:
            color = convert_color(color_input)
        except ValueError as e:
            return jsonify({"message": f"Invalid color format: {str(e)}"}), 400

        # Create a drawing object
        draw = ImageDraw.Draw(template)
        
        # Use the downloaded font
        try:
            font = ImageFont.truetype(temp_font_path, font_size)
            print(f"Successfully loaded font with size {font_size}")
        except Exception as e:
            print(f"Error loading font, using default: {str(e)}")
            default_font = get_default_font()
            if isinstance(default_font, str):
                font = ImageFont.truetype(default_font, font_size)
            else:
                font = default_font
            print("Using default font as fallback")
        
        # Add text
        draw.text((textX, textY), name, fill=color, font=font)
        print(f"Added text '{name}' at position ({textX}, {textY})")
        
        # Clean up temporary font file
        try:
            if os.path.exists(temp_font_path):
                os.remove(temp_font_path)
                print("Cleaned up temporary font file")
        except Exception as e:
            print(f"Warning: Could not remove temporary font file: {str(e)}")
        
        # Save to BytesIO
        image_stream = BytesIO()
        template.save(image_stream, format='PNG')
        image_stream.seek(0)
        
        try:
            # Upload to Cloudinary
            upload_result = cloudinary.uploader.upload(
                image_stream,
                folder = "tedx-certificates/samples",
                public_id = "sample",
                resource_type = "image",
                overwrite = True,
                invalidate = True
            )
            
            print(f"Sample certificate uploaded successfully: {upload_result['secure_url']}")
            
            return jsonify({
                "message": "Sample certificate generated successfully",
                "url": upload_result['secure_url'],
                "public_id": upload_result['public_id']
            }), 200
            
        except Exception as upload_error:
            print(f"Upload error: {str(upload_error)}")
            raise upload_error

    except Exception as e:
        print(f"Error details: {str(e)}")
        return jsonify({
            "message": "Error generating sample certificate",
            "details": str(e)
        }), 500

@app.route('/api/uploadTemplate', methods=['POST'])
def upload_template():
    try:
        print("Starting template upload process...")
        
        if 'template' not in request.files:
            print("No file found in request.files:", list(request.files.keys()))
            return jsonify({
                "message": "No template file provided",
                "details": "Please include a template file with key 'template' in the request"
            }), 400

        template_file = request.files['template']
        print(f"Received file: {template_file.filename}")
        
        if template_file.filename == '':
            return jsonify({
                "message": "No template file selected",
                "details": "Please select a file to upload"
            }), 400

        # Print Cloudinary configuration
        print("Cloudinary Configuration:")
        print(f"Cloud name: {cloudinary.config().cloud_name}")
        print(f"API Key exists: {'api_key' in cloudinary.config().__dict__}")

        # Upload to Cloudinary
        print("Attempting to upload to Cloudinary...")
        upload_result = cloudinary.uploader.upload(
            template_file,
            folder = "tedx-certificates/templates",
            public_id = "template",  # Fixed public_id for the template
            resource_type = "image",
            overwrite = True,  # Override existing template if any
            unique_filename = False  # Ensure we don't get a random suffix
        )
        
        print("Upload successful!")
        print(f"Upload result: {upload_result}")

        # Verify the upload by trying to access it
        try:
            verification = cloudinary.api.resource(upload_result['public_id'])
            print(f"Verification successful: {verification}")
        except Exception as verify_error:
            print(f"Verification failed: {str(verify_error)}")
            raise verify_error

        return jsonify({
            "message": "Template uploaded successfully",
            "url": upload_result['secure_url'],
            "public_id": upload_result['public_id'],
            "resource_type": upload_result['resource_type'],
            "type": upload_result['type'],
            "format": upload_result.get('format', 'unknown')
        }), 200

    except Exception as e:
        print(f"Error details: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "message": "Error uploading template",
            "details": str(e),
            "error_type": str(type(e))
        }), 500

@app.route('/api/checkTemplate', methods=['GET'])
def check_template():
    try:
        template_path = "tedx-certificates/templates/template"
        print(f"Checking template at: {template_path}")
        
        # Try to get the resource info
        resource = cloudinary.api.resource(template_path)
        
        return jsonify({
            "message": "Template found",
            "details": {
                "public_id": resource['public_id'],
                "url": resource['url'],
                "format": resource['format'],
                "version": resource['version']
            }
        }), 200
    except Exception as e:
        print(f"Error checking template: {str(e)}")
        return jsonify({
            "message": "Template not found",
            "details": str(e),
            "help": "Please upload a template using the /api/uploadTemplate endpoint"
        }), 404

@app.route('/api/testCloudinary', methods=['GET'])
def test_cloudinary():
    try:
        # Test Cloudinary configuration
        config = cloudinary.config()
        
        # Create a simple test
        test_result = {
            "cloud_name": config.cloud_name,
            "api_key_configured": bool(config.api_key),
            "api_secret_configured": bool(config.api_secret),
            "configuration_valid": all([
                config.cloud_name,
                config.api_key,
                config.api_secret
            ])
        }
        
        return jsonify({
            "message": "Cloudinary configuration test",
            "details": test_result
        }), 200
        
    except Exception as e:
        return jsonify({
            "message": "Error testing Cloudinary configuration",
            "details": str(e)
        }), 500

@app.route('/api/setupFont', methods=['GET'])
def setup_font():
    try:
        fonts_dir = os.path.join(os.path.dirname(__file__), 'fonts')
        font_path = os.path.join(fonts_dir, 'font.ttf')
        
        # Create fonts directory if it doesn't exist
        if not os.path.exists(fonts_dir):
            os.makedirs(fonts_dir)
        
        # Download Roboto Regular font if it doesn't exist
        if not os.path.exists(font_path):
            font_url = "https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Regular.ttf"
            print(f"Downloading font from {font_url}")
            
            # Download with proper headers
            headers = {'User-Agent': 'Mozilla/5.0'}
            req = urllib.request.Request(font_url, headers=headers)
            with urllib.request.urlopen(req) as response, open(font_path, 'wb') as out_file:
                shutil.copyfileobj(response, out_file)
            
            print(f"Font downloaded to {font_path}")
        
        return jsonify({
            "message": "Font setup successful",
            "path": font_path
        }), 200
        
    except Exception as e:
        print(f"Error setting up font: {str(e)}")
        return jsonify({
            "message": "Error setting up font",
            "details": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True)
