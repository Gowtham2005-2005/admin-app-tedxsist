'use client'
import React from 'react'
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { Button } from "@/components/ui/button";
export default function certificateGeneration() {
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
  
  
  return (
    
    <>
    <section className="hidden lg:block text-foreground">
      
    </section>


    <section className="lg:hidden text-foreground">
        <div className="mb-4">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mb-16 items-center justify-center text-center">
      <span className="bg-gradient-to-b from-foreground to-transparent bg-clip-text text-[10rem] font-extrabold leading-none text-transparent">
        403
      </span>
      <h2 className="my-2 font-heading text-2xl font-bold">
        Hey {user.name}
      </h2>
      <p>
       Probably you are using a mobile view. Please Switch to desktop for this page.
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
