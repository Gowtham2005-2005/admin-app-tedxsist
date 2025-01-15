import colorsys
import webcolors
from flask import Flask, request, jsonify
from PIL import Image, ImageDraw, ImageFont
from flask_cors import CORS
import re
import os
import io
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from google.oauth2.service_account import Credentials
import firebase_admin
from firebase_admin import credentials, firestore


app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}})

# Firebase Admin SDK initialization
cred = credentials.Certificate("path/to/firebase-service-account.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Google Drive API setup
SCOPES = ["https://www.googleapis.com/auth/drive"]
drive_credentials = Credentials.from_service_account_file("path/to/google-drive-service-account.json", scopes=SCOPES)
drive_service = build("drive", "v3", credentials=drive_credentials)

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


def get_or_create_drive_folder(folder_name):
    """
    Get or create a Google Drive folder.
    """
    query = f"mimeType='application/vnd.google-apps.folder' and name='{folder_name}' and trashed=false"
    results = drive_service.files().list(q=query, fields="files(id)").execute()
    folders = results.get("files", [])
    
    if folders:
        return folders[0]["id"]  # Return the first folder's ID if it exists

    # Create a new folder
    folder_metadata = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder"
    }
    folder = drive_service.files().create(body=folder_metadata, fields="id").execute()
    return folder["id"]

def upload_to_google_drive(file_stream, file_name, folder_id, email):
    """
    Upload a file to Google Drive and set permissions for the provided email.
    """
    media = MediaIoBaseUpload(file_stream, mimetype="image/png")
    file_metadata = {
        "name": file_name,
        "parents": [folder_id]
    }
    uploaded_file = drive_service.files().create(
        body=file_metadata, media_body=media, fields="id, webViewLink"
    ).execute()

    # Set permissions for the email
    drive_service.permissions().create(
        fileId=uploaded_file["id"],
        body={
            "type": "user",
            "role": "reader",
            "emailAddress": email
        },
        fields="id"
    ).execute()

    return uploaded_file

@app.route('/api/generateCertificates', methods=['POST'])
def generate_certificates():
    try:
        # Get data from the request
        data = request.get_json()
        if not data:
            return jsonify({"message": "Invalid data"}), 400

        # Retrieve participant data from Firestore
        participants_ref = db.collection("participants")
        participants = participants_ref.get()

        if not participants:
            return jsonify({"message": "No participants found"}), 400

        # Get input values
        font_size = int(data.get("fontSize", 72))
        color_input = data.get("color", [0, 0, 0])
        textX = int(data.get("textX", 300))
        textY = int(data.get("textY", 400))

        # Convert the color to RGB format
        try:
            color = convert_color(color_input)
        except ValueError as e:
            return jsonify({"message": f"Invalid color format: {str(e)}"}), 400

        # Google Drive folder
        folder_id = get_or_create_drive_folder("tedxsist_cert")

        # Process each participant
        for participant in participants:
            participant_data = participant.to_dict()
            name = participant_data.get("name", "Participant")
            email = participant_data.get("email", None)
            if not email:
                continue  # Skip participants without an email address
            
            # Generate certificate in memory
            template_path = os.path.join(os.path.dirname(os.getcwd()), 'public', '_TEMP', 'template.png')
            font_path = os.path.join(os.path.dirname(os.getcwd()), 'public', 'google-fonts', 'font.ttf')
            
            # Create an in-memory image stream
            image_stream = io.BytesIO()
            template = Image.open(template_path)
            draw = ImageDraw.Draw(template)
            
            # Load font
            font = ImageFont.truetype(font_path, font_size)
            draw.text((textX, textY), name, fill=color, font=font)
            template.save(image_stream, format="PNG")
            image_stream.seek(0)
            
            # Upload to Google Drive
            uploaded_file = upload_to_google_drive(image_stream, f"{name}_certificate.png", folder_id, email)

            # Update Firestore with the Google Drive link and certgen:true
            participants_ref.document(participant.id).update({
                "certificateLink": uploaded_file.get("webViewLink"),
                "certgen": True  # Mark certificate generation as complete
            })

        return jsonify({"message": "Certificates generated, uploaded, and links updated successfully"}), 200

    except Exception as e:
        return jsonify({"message": f"Error generating certificates: {str(e)}"}), 500



@app.route('/api/generateSample', methods=['POST'])
def generate_sample_certificate():
    try:
        # Get the data from the request
        data = request.get_json()
        if not data:
            return jsonify({"message": "Invalid data"}), 400
        
        # Extract values from the request data and convert to integers where needed
        name = data.get("name", "Sample Name")
        font_size = int(data.get("fontSize", 72))  # Ensure font_size is an integer
        color_input = data.get("color", [0, 0, 0])  # Default to black if not provided
        textX = int(data.get("textX", 300))  # Ensure textX is an integer
        textY = int(data.get("textY", 400))  # Ensure textY is an integer
        
        # Convert the color to RGB format
        try:
            color = convert_color(color_input)
        except ValueError as e:
            return jsonify({"message": f"Invalid color format: {str(e)}"}), 400
        
        # Define paths to the template, font, and the output path
        template_path = os.path.join(os.path.dirname(os.getcwd()), 'public', '_TEMP', 'template.png')
        font_path = os.path.join(os.path.dirname(os.getcwd()), 'public', 'google-fonts', 'font.ttf')
        output_path = os.path.join(os.path.dirname(os.getcwd()), 'public', '_TEMP', 'sample.png')

        # Ensure the output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Generate and save the certificate image
        generate_certificate(name, font_path, font_size, template_path, (textX, textY), color, output_path)
        
        # Return success message
        return jsonify({"message": "Certificate generated successfully", "file": output_path}), 200

    except Exception as e:
        return jsonify({"message": f"Error generating certificate: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True)