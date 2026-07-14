from fastapi import FastAPI, HTTPException, Request, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import colorsys
import webcolors
from PIL import Image, ImageDraw, ImageFont
import re
import os
import io
import time
import urllib.request
import shutil
import json
import firebase_admin
from firebase_admin import credentials, firestore
import cloudinary
import cloudinary.uploader
import cloudinary.api
from cloudinary.utils import cloudinary_url
import requests
from io import BytesIO
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

firebase_service_json = os.getenv("FIREBASE_SERVICE")
if firebase_service_json:
    try:
        cred_dict = json.loads(firebase_service_json)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Firebase initialized successfully!")
    except Exception as e:
        print(f"Failed to initialize Firebase: {e}")
        db = None
else:
    print("FIREBASE_SERVICE environment variable is missing!")
    db = None

def convert_color(color_input):
    if isinstance(color_input, list):
        if len(color_input) == 3:
            return tuple(color_input)
        raise ValueError("RGB color must be a list of 3 values.")
    elif isinstance(color_input, str):
        if color_input.startswith("#"):
            try:
                return webcolors.hex_to_rgb(color_input)
            except ValueError:
                raise ValueError(f"Invalid HEX color format: {color_input}")
        if color_input.startswith("hsl"):
            match = re.match(r"hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)", color_input.strip())
            if match:
                h = int(match.group(1))
                s = int(match.group(2)) / 100
                l = int(match.group(3)) / 100
                r, g, b = colorsys.hls_to_rgb(h / 360, l, s)
                return (int(r * 255), int(g * 255), int(b * 255))
            raise ValueError(f"Invalid HSL color format: {color_input}")
    raise ValueError("Unsupported color format")

def upload_to_google_drive(file_stream, file_name, folder_id):
    SCOPES = ["https://www.googleapis.com/auth/drive.file"]
    service_account_json = json.loads(os.getenv("GOOGLE_CREDENTIALS"))
    service_account_json["private_key"] = service_account_json["private_key"].replace("\\n", "\n")
    creds = Credentials.from_service_account_info(service_account_json, scopes=SCOPES)
    drive_service = build("drive", "v3", credentials=creds)

    file_metadata = {
        "name": file_name,
        "parents": [folder_id]
    }
    media = MediaIoBaseUpload(file_stream, mimetype="image/png")
    uploaded_file = drive_service.files().create(body=file_metadata, media_body=media, fields="id").execute()
    file_id = uploaded_file.get("id")
    permission = {"type": "anyone", "role": "reader"}
    drive_service.permissions().create(fileId=file_id, body=permission).execute()
    return f"https://drive.google.com/file/d/{file_id}/view"

def get_default_font():
    try:
        if os.name == "nt":
            font_path = "C:\\Windows\\Fonts\\arial.ttf"
        else:
            font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
        if os.path.exists(font_path):
            return font_path
        return ImageFont.load_default()
    except Exception as e:
        return ImageFont.load_default()


@app.post("/api/generateCertificates")
async def generate_certificates(request: Request):
    try:
        data = await request.json()
        if not data:
            raise HTTPException(status_code=400, detail="Invalid data")

        try:
            template_resource = cloudinary.api.resource("tedx-certificates/templates/template")
            template_url = template_resource["secure_url"]
            response = requests.get(template_url)
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to download template")
            template = Image.open(BytesIO(response.content))
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Template not found: {str(e)}")

        font_extensions = ["ttf", "otf"]
        font_url = None
        font_ext = None
        for ext in font_extensions:
            try:
                font_resource = cloudinary.api.resource(f"tedx-certificates/fonts/font.{ext}", resource_type="raw")
                font_url = font_resource["secure_url"]
                font_ext = ext
                break
            except Exception:
                continue
        
        if not font_url:
            raise HTTPException(status_code=404, detail="No font file found")
            
        font_response = requests.get(font_url)
        temp_font_path = os.path.join(os.path.dirname(__file__), f"temp_font.{font_ext}")
        with open(temp_font_path, "wb") as f:
            f.write(font_response.content)

        font_size = int(data.get("fontSize", 72))
        color_input = data.get("color", [0, 0, 0])
        textX = int(data.get("textX", 300))
        textY = int(data.get("textY", 400))

        try:
            color = convert_color(color_input)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        if not db:
            raise HTTPException(status_code=500, detail="Firebase DB not initialized")

        participants = db.collection("participants").where("attend", "==", True).get()
        if not participants:
            raise HTTPException(status_code=400, detail="No participants found with attended == true")

        drive_links = []
        folder_id = "14EDF_vrum_g_8ofzUjCpKJzuSrmVtC2C"

        try:
            font = ImageFont.truetype(temp_font_path, font_size)
        except Exception as e:
            default_font = get_default_font()
            if isinstance(default_font, str):
                font = ImageFont.truetype(default_font, font_size)
            else:
                font = default_font

        for participant in participants:
            try:
                p_data = participant.to_dict()
                name = p_data.get("name", "").strip()
                email = p_data.get("email", "").strip().lower()
                if not email:
                    continue

                cert_image = template.copy()
                draw = ImageDraw.Draw(cert_image)
                draw.text((textX, textY), name, fill=color, font=font)

                image_stream = BytesIO()
                cert_image.save(image_stream, format="PNG")
                image_stream.seek(0)

                link = upload_to_google_drive(image_stream, f"{name.replace(\" \", \"_\")}.png", folder_id)
                drive_links.append({"name": name, "link": link})

                db.collection("participants").document(participant.id).update({"certgen": link})
            except Exception as e:
                print(f"Error processing {name}: {e}")
                continue

        if os.path.exists(temp_font_path):
            os.remove(temp_font_path)

        return {"message": "Certificates generated successfully", "links": drive_links}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generateSample")
async def generate_sample(request: Request):
    try:
        data = await request.json()
        if not data:
            raise HTTPException(status_code=400, detail="Invalid data")

        try:
            template_resource = cloudinary.api.resource("tedx-certificates/templates/template")
            template_url = template_resource["secure_url"]
        except Exception as e:
            raise HTTPException(status_code=404, detail="Template not found")

        font_extensions = ["ttf", "otf"]
        font_url = None
        for ext in font_extensions:
            try:
                font_resource = cloudinary.api.resource(f"tedx-certificates/fonts/font.{ext}", resource_type="raw")
                font_url = font_resource["secure_url"]
                break
            except Exception:
                continue
        
        if not font_url:
            raise HTTPException(status_code=404, detail="No font file found")
            
        font_response = requests.get(font_url)
        temp_font_path = os.path.join(os.path.dirname(__file__), f"temp_font.{ext}")
        with open(temp_font_path, "wb") as f:
            f.write(font_response.content)

        response = requests.get(template_url)
        template = Image.open(BytesIO(response.content))

        name = data.get("name", "Sample Name")
        font_size = int(data.get("fontSize", 72))
        color_input = data.get("color", [0, 0, 0])
        textX = int(data.get("textX", 300))
        textY = int(data.get("textY", 400))
        color = convert_color(color_input)

        draw = ImageDraw.Draw(template)
        try:
            font = ImageFont.truetype(temp_font_path, font_size)
        except Exception:
            default_font = get_default_font()
            if isinstance(default_font, str):
                font = ImageFont.truetype(default_font, font_size)
            else:
                font = default_font
        
        draw.text((textX, textY), name, fill=color, font=font)

        if os.path.exists(temp_font_path):
            os.remove(temp_font_path)

        image_stream = BytesIO()
        template.save(image_stream, format="PNG")
        image_stream.seek(0)

        upload_result = cloudinary.uploader.upload(
            image_stream,
            folder="tedx-certificates/samples",
            public_id="sample",
            resource_type="image",
            overwrite=True,
            invalidate=True
        )

        return {
            "message": "Sample certificate generated successfully",
            "url": upload_result["secure_url"],
            "public_id": upload_result["public_id"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/uploadTemplate")
async def upload_template(template: UploadFile = File(...)):
    try:
        contents = await template.read()
        image_stream = BytesIO(contents)

        upload_result = cloudinary.uploader.upload(
            image_stream,
            folder="tedx-certificates/templates",
            public_id="template",
            resource_type="image",
            overwrite=True,
            unique_filename=False
        )
        return {
            "message": "Template uploaded successfully",
            "url": upload_result["secure_url"],
            "public_id": upload_result["public_id"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/checkTemplate")
async def check_template():
    try:
        resource = cloudinary.api.resource("tedx-certificates/templates/template")
        return {
            "message": "Template found",
            "details": {
                "public_id": resource["public_id"],
                "url": resource["url"]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/get-sample")
async def get_sample():
    try:
        resource = cloudinary.api.resource("tedx-certificates/samples/sample")
        return {"url": resource["secure_url"]}
    except Exception as e:
        raise HTTPException(status_code=404, detail="No sample certificate found")

@app.get("/api/testCloudinary")
async def test_cloudinary():
    config = cloudinary.config()
    return {
        "message": "Cloudinary configuration test",
        "details": {
            "cloud_name": config.cloud_name,
            "api_key_configured": bool(config.api_key),
            "api_secret_configured": bool(config.api_secret)
        }
    }

