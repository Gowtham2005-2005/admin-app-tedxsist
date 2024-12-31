'use client'

import React, { useState } from 'react';
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

  const handleSaveClick = () => {
    toast.success(`Hey ${user?.name}, Template saved successfully!`);
  };

  const handleSendEmail = () => {
    toast.success(`Hey ${user?.name}, Email has been sent successfully!`);
  };

  const handleCreateSampleClick = () => {
    toast.success(`Hey ${user?.name}, Sample Generated!`);
  };

  const handleCreateClick = () => {
    toast.success(`Hey ${user?.name}, Generated Certificates Successfully!`);
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
      <Input id="picture" type="file" className="border p-2 rounded-md shadow-sm" />
      <Button onClick={handleSaveClick}>Save Template</Button>

      <Popover>
        <PopoverTrigger asChild>
          
          <Button variant="outline">Open popover</Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Dimensions</h4>
              <p className="text-sm text-muted-foreground">
                Set the dimensions for the layer.
              </p>
            </div>
            <div className="grid gap-2">
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="width">Width</Label>
                <Input
                  id="width"
                  defaultValue="100%"
                  className="col-span-2 h-8"
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="maxWidth">Max. width</Label>
                <Input
                  id="maxWidth"
                  defaultValue="300px"
                  className="col-span-2 h-8"
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  defaultValue="25px"
                  className="col-span-2 h-8"
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="maxHeight">Max. height</Label>
                <Input
                  id="maxHeight"
                  defaultValue="none"
                  className="col-span-2 h-8"
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex justify-center space-x-4 w-full">
        <Button variant="outline" className="flex-1" onClick={handleCreateSampleClick}>
          Generate Sample
        </Button>

        <Button variant="outline" className="flex-1" onClick={handleView}>
          View Sample
        </Button>

        <Drawer open={isDrawerOpen} onClose={handleClose}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="flex justify-center">View Sample</DrawerTitle>
              <DrawerDescription className="flex justify-center">Check Whether the Alignment for the generated Certificate is proper</DrawerDescription>
            </DrawerHeader>
            <div className="flex justify-center my-4">
              <Image 
                src="/path/to/Sample.png" 
                alt="Sample Certificate" 
                width={600}
                height={400}
                className="max-w-full h-auto"
              />
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
        Generate Certificates
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
