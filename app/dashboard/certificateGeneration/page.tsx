'use client'
import React, { useState, useRef,useEffect } from 'react';
import { Settings,Eye, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from 'next/image';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
export default function CertificateGeneration() {
  const [dimensions, setDimensions] = useState({
    font_size: '200',
    color: '#000000', 
    textX: '25',
    textY: '25',
  });
  const [loading, setLoading] = useState(false);

  // Load dimensions from localStorage on mount
  useEffect(() => {
    const savedDimensions = localStorage.getItem('certificateDimensions');
    if (savedDimensions) {
      setDimensions(JSON.parse(savedDimensions));
    }
  }, []);

  const handleDimensionChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const newDimensions = { ...dimensions, [field]: e.target.value };
    setDimensions(newDimensions);

    // Save the updated dimensions to localStorage
    localStorage.setItem('certificateDimensions', JSON.stringify(newDimensions));
  };
  const router = useRouter();
  const token = sessionStorage.getItem('Token');
  let user = null;

  if (token) {
    try { 
      user = jwtDecode(token); // Decoding the token and storing user info
    } catch (error) {
      console.error('Invalid token:', error);
    }
  }
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];

  if (!file) return;

  // Manually extract the file extension
  const filename = file.name;
  const fileExtension = filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();

  const validExtensions = ['ttf'];
  if (!validExtensions.includes(fileExtension)) {
    toast.error('Please upload a valid font file (.ttf only)');
    return;
  }

  // Proceed with FormData if the file is valid
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/uploadFont', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (response.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.error || 'An error occurred');
    }
  } catch (err) {
    console.error('Error uploading font:', err);
    toast.error('Failed to upload font');
  }
};



  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/png') {
      toast.error('Please upload an image file with the format .png');
      return;
    }

    setSelectedFile(file);
    toast.success(`Hey ${user?.name}, Template uploaded successfully!`);
  };
const handleSaveClick = async () => {
    if (!selectedFile) {
      toast.error('No file selected to save!');
      return;
    }
    if (selectedFile.type !== 'image/png') {
  toast.error('The selected file is not in PNG format!');
  return;
}
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/uploadTemplate', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast.success(`Hey ${user?.name || 'User'}, Template saved successfully!`);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Reset the file input field
        }
      } else {
        toast.error('Failed to save the template');
      }
    } catch (err) {
      console.error('Error saving file:', err);
      toast.error('Failed to save the template. Please try again.');
    }
  };

  const handleSendEmail = () => {
    toast.success(`Hey ${user?.name}, Email has been sent successfully!`);
  };

  const handleCreateSampleClick = async () => {
  if (!dimensions) {
    toast.error('Missing dimensions');
    return;
  }

  const sampleData = {
    fontSize: dimensions.font_size,
    color: dimensions.color,
    textX: dimensions.textX,
    textY: dimensions.textY,
    name: "Sample Name"
  };
  
  try {
    // Call API to generate the sample certificate
    const response = await fetch('http://localhost:5000/api/generateSample', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleData),
    });

    if (response.ok) {
      toast.success(`Hey ${user?.name}, Sample Generated!`);
    } else {
      const errorData = await response.json();
toast.error('Failed to generate sample: ' + (errorData.message || 'Unknown error occurred'));
    }
  } catch (err) {
    console.error('Error generating sample:', err);
    toast.error('Error generating sample. Please try again');
  }
};


  const handleCreateClick = async () => {
  if (!dimensions ) {
    toast.error('Missing dimensions');
    return;
  }

  const formData = {
  fontSize: dimensions.font_size,
  color: dimensions.color,
  textX: dimensions.textX,
  textY: dimensions.textY
};
setLoading(true);
  try {
  
    const response = await fetch('http://localhost:5000/api/generateCertificates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });
    const data = await response.json();
    if (response.ok) {
    toast.success(`Hey ${user?.name}, Certificates Generated!`);
    } else {
      toast.error(data.message || 'Failed to generate Certificate');
    }
  } catch (err) {
    console.error('Error generating Certificate:', err);
    toast.error('Error generating Certificate. Please try again');
  }
  finally {
    // Set loading to false once the process is complete
    setLoading(false);
  }

  };

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleView = () => {
    setIsDrawerOpen(true);
  };

  const handleClose = () => {
    setIsDrawerOpen(false);
  };

  return (
    <>
      <section className="hidden lg:block text-foreground">
        <div className='flex justify-between items-center'>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Certificate Generation</h2>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button>Send Email</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will send emails to all selected participants. Please review before proceeding.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSendEmail}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Card className="flex items-center justify-center h-[600px] my-4">
  <CardHeader>
    <CardTitle>Template Settings</CardTitle>
    <CardDescription>Upload and configure certificate templates
      
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="grid w-[400px] max-w-sm items-center gap-4">
      
      <Label htmlFor="picture" className="font-medium">Upload Certificate Template</Label>
      <Input id="picture" accept=".png" type="file" ref={fileInputRef} className="border p-2 rounded-md shadow-sm file:cursor-pointer" onChange={handleFileUpload} />
      <Button onClick={handleSaveClick}>Save Template</Button>

      <Popover>
  <PopoverTrigger asChild>
    <Button variant="outline"><Settings size={18} color="white" className='mx-2'/>Settings</Button>
  </PopoverTrigger>
  <PopoverContent className="w-80">
    <div className="grid gap-4">
      <div className="space-y-2">
        <h4 className="font-medium leading-none">Settings</h4>
        <p className="text-sm text-muted-foreground">
          Set the dimensions and fonts parameters for the certificate layout.
        </p>
      </div>
      <div className="grid gap-2">
        
        <div className="grid grid-cols-3 items-center gap-4">
          <Label htmlFor="width">Font Size</Label>
          <Input
            id="font_size"
            value={dimensions.font_size}
            className="col-span-2 h-8"
            onChange={(e) => handleDimensionChange(e, 'font_size')}
          />
        </div>
                <div className="grid grid-cols-3 items-center gap-4">
          <Label htmlFor="maxHeight">Upload font</Label>
          <Input
  type="file"
  id="fontFile"
  accept=".ttf"
  className="col-span-2 h-8 file:rounded-md file:cursor-pointer"
  onChange={handleFontUpload}
/>
        </div>
<div className="grid grid-cols-3 items-center gap-4">
  <Label htmlFor="color" className="text-white">Color</Label>
  <Input
    id="color"
    type="color"
    value={dimensions.color} // Assuming you are storing the color in the `dimensions` object
    className="col-span-2 h-8"
    onChange={(e) => handleDimensionChange(e, 'color')}
  />
</div>


        <div className="grid grid-cols-3 items-center gap-4">
          <Label htmlFor="height">textX</Label>
          <Input
            id="textX"
            value={dimensions.textX}
            className="col-span-2 h-8"
            onChange={(e) => handleDimensionChange(e, 'textX')}
          />
        </div>
        <div className="grid grid-cols-3 items-center gap-4">
          <Label htmlFor="maxHeight">textY</Label>
          <Input
            id="textY"
            value={dimensions.textY}
            className="col-span-2 h-8"
            onChange={(e) => handleDimensionChange(e, 'textY')}
          />
        </div>

      </div>
    </div>
  </PopoverContent>
</Popover>


      <div className="flex justify-center space-x-4 w-full">
        <Button variant="outline" className="flex-1" onClick={handleCreateSampleClick}>
          <RefreshCw size={18} color='white' className='mx-2'/>
          Generate Sample
        </Button>

        <Button variant="outline" className="flex-1" onClick={handleView}>
          <Eye size={18} color='white' className='mx-2'/>
          View Sample
        </Button>

        <Drawer open={isDrawerOpen} onClose={handleClose}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="flex justify-center">View Sample</DrawerTitle>
              <DrawerDescription className="flex justify-center">Check Whether the Alignment for the generated Certificate is proper</DrawerDescription>
            </DrawerHeader>
            <div className="flex justify-center my-4">
              <div className="relative w-full h-[400px]"> {/* Adjust `h-[400px]` as needed */}
  <Image
    src={`/_TEMP/sample.png?v=${new Date().getTime()}`}
    alt="Sample Certificate"
    className="object-contain"
    quality={100}
    fill
    priority
  />
</div>



            </div>
            <DrawerFooter>
              <div className="flex justify-center">
                <DrawerClose asChild>
                  <Button variant="outline">Close</Button>
                </DrawerClose>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>

      <Button className="flex-1" onClick={handleCreateClick}>
  {/* Conditionally render text or loading spinner */}
  {loading ? (
    <div className="flex justify-center items-center">
      <span className="text-md">Uploading Certificates...</span>
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white-500 ml-2"></div>
    </div>
  ) : (
    "Generate Certificates"
  )}
</Button>

      
    </div>
  </CardContent>
 
</Card>
        
      </section>

        <section className="lg:hidden text-foreground">
        <div className="mb-4">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mb-16 items-center justify-center text-center">
            <span className="bg-gradient-to-b from-foreground to-transparent bg-clip-text text-[10rem] font-extrabold leading-none text-transparent">
              403
            </span>
            <h2 className="my-2 font-heading text-2xl font-bold">
              Hey {user?.name}
            </h2>
            <p>
              Probably you are using a mobile view. Please switch to desktop for this page.
            </p>
            <div className="mt-8 flex justify-center gap-2">
              <Button onClick={() => router.push("/dashboard/qrTicketing")} variant="default" size="lg">
                Go back
              </Button>
              <Button
                onClick={() => router.push("/dashboard/qrTicketing")}
                variant="ghost"
                size="lg"
              >
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}