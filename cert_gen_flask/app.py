import colorsys
import webcolors
import os
from flask import Flask, request, jsonify
from PIL import Image, ImageDraw, ImageFont
from flask_cors import CORS
import re

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}})

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
