'use client';
import React, { useState, useEffect } from 'react';
import { Separator } from "@/components/ui/separator";
import { useRouter } from 'next/navigation';
import { jwtDecode } from "jwt-decode";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "@/firebase";

export default function Page() {
  const router = useRouter();
  const [counts, setCounts] = useState({ total: 0, selected: 0, rejected: 0 });

  const handleNavigation = (route: string) => {
    router.push(route);
  };
    
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('Token') : null;
  let user: { name?: string; picture?: string; [key: string]: unknown } | null = null;

  if (token) {
    try {
      user = jwtDecode(token);
    } catch (error) {
      console.error('Invalid token:', error);
    }
  }

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const participantsCol = collection(db, "participants");
        
        // Use getCountFromServer to avoid reading all documents
        const totalSnap = await getCountFromServer(participantsCol);
        
        const selectedQuery = query(participantsCol, where("selected", "==", true));
        const selectedSnap = await getCountFromServer(selectedQuery);
        
        const rejectedQuery = query(participantsCol, where("rejection_email_sent", "==", true));
        const rejectedSnap = await getCountFromServer(rejectedQuery);
        
        const total = totalSnap.data().count;
        const selected = selectedSnap.data().count;
        const rejected = rejectedSnap.data().count;
        
        setCounts({ total, selected, rejected });
      } catch (error) {
        console.error("Error fetching KPIs:", error);
      }
    };
    
    fetchCounts();
  }, []);

  // Return null while redirecting or if user is not authenticated
  if (!user && token) {
    return null;
  }

  return (
    <div className='text-foreground'>
      <div className="space-y-1">
        <h2 className="text-lg font-medium leading-none">Welcome {user?.name || 'Admin'}</h2>
        <p className="text-sm text-muted-foreground">
          Here is the current overview of registrations.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        <div className="p-4 border rounded-xl bg-card text-card-foreground shadow">
          <h3 className="text-sm font-medium opacity-70">Total Registrations</h3>
          <p className="text-3xl font-bold mt-2">{counts.total}</p>
        </div>
        <div className="p-4 border rounded-xl bg-card text-card-foreground shadow">
          <h3 className="text-sm font-medium opacity-70">Selected Participants</h3>
          <p className="text-3xl font-bold mt-2 text-green-500">{counts.selected}</p>
        </div>
        <div className="p-4 border rounded-xl bg-card text-card-foreground shadow">
          <h3 className="text-sm font-medium opacity-70">Rejected Participants</h3>
          <p className="text-3xl font-bold mt-2 text-red-500">{counts.rejected}</p>
        </div>
      </div>

      <Separator className="my-4" />
      
      <div className="flex h-5 items-center space-x-4 text-sm mt-4">
        <div onClick={() => handleNavigation('/dashboard/participationSelection')} className="cursor-pointer font-medium hover:underline">Participation Selection</div>
        <Separator orientation="vertical" />
        <div onClick={() => handleNavigation('/dashboard/qrTicketing')} className="cursor-pointer font-medium hover:underline">QR Ticketing</div>
        <Separator orientation="vertical"  />
        <div onClick={() => handleNavigation('/dashboard/certificateGeneration')} className="cursor-pointer font-medium hover:underline">Certificate Generation</div>
      </div>
    </div>
  );
}
