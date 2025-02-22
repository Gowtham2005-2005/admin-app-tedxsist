'use client';
import React from 'react';
import { Separator } from "@/components/ui/separator";
import { useRouter } from 'next/navigation';
import { jwtDecode } from "jwt-decode";

export default function Page() {
  const router = useRouter();

  const handleNavigation = (route: string) => {
    router.push(route); // Navigate to the specified route
  };
    
  const token = sessionStorage.getItem('Token');
  let user: { name: string } | null = null;

  if (token) {
    try {
      user = jwtDecode(token); // Decoding the token and storing user info
    } catch (error) {
      console.error('Invalid token:', error);
      router.push('/');
    }
  } else {
    // Redirect to login if no token
    router.push('/');
    return null;
  }

  // Return null while redirecting or if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className='text-foreground'>
      <div className="space-y-1">
        <h2 className="text-lg font-medium leading-none">Welcome {user.name}</h2>
        <p className="text-sm text-muted-foreground">
          Please Navigate through Operations
        </p>
      </div>
      <Separator className="my-4 " />
      <div className="flex h-5 items-center space-x-4 text-sm">
        <div onClick={() => handleNavigation('/dashboard/participationSelection')} className="cursor-pointer">Participation Selection</div>
        <Separator orientation="vertical" />
        <div onClick={() => handleNavigation('/dashboard/qrTicketing')} className="cursor-pointer">QR Ticketing</div>
        <Separator orientation="vertical"  />
        <div onClick={() => handleNavigation('/dashboard/certificateGeneration')} className="cursor-pointer">Certificate Generation</div>
      </div>
    </div>
  );
}
