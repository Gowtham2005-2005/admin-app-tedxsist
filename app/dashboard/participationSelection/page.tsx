'use client'
import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase"; // Import your Firebase instance
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";

import { DataTableDemo } from "@/components/datatable";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export interface Participant {
  id: string;
  name: string;
  degree: string;
  department: string;
  experienceResponse: string;
  resilienceResponse: string;
  goalsResponse: string;
  email: string;
  selected: boolean;
}

export default function ParticipationSelection() {

  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [emailData, setEmailData] = useState({ subject: '', text: '' });
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false); // State to control the Sheet visibility
  const router = useRouter();
  const token = sessionStorage.getItem('Token');
  const [isLoading, setIsLoading] = useState(false);
  let user = null;

  if (token) {
    try {
      user = jwtDecode(token); // Decoding the token and storing user info
    } catch (error) {
      console.error('Invalid token:', error);
    }
  }


  useEffect(() => {
    const fetchParticipants = async () => {
      const participantsCollection = collection(db, "participants");
      const participantSnapshot = await getDocs(participantsCollection);
      const participantList = participantSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        selected: doc.data().selected || false, // Ensure "selected" field is fetched and initialized
      })) as Participant[];
      setParticipants(participantList);
    };
    fetchParticipants();
  }, []);

  const handleSendEmail = async (type) => {
    // Separate participants into selected and not selected
    const selectedParticipants = participants.filter((p) => p.selected);
    const notSelectedParticipants = participants.filter((p) => !p.selected);
  
    console.log("Selected participants:", selectedParticipants);
    console.log("Not selected participants:", notSelectedParticipants);
  
    // Get email addresses and usernames for both groups
    const selectedEmailAddresses = selectedParticipants.map((p) => p.email);
    const selectedUsernames = selectedParticipants.map((p) => p.name);
    const notSelectedEmailAddresses = notSelectedParticipants.map((p) => p.email);
    const notSelectedUsernames = notSelectedParticipants.map((p) => p.name);
  
    // Prepare email data for selected participants
    const selectedEmailDetails = {
      to: selectedEmailAddresses,
      usernames: selectedUsernames,
    };
  
    // Prepare email data for not selected participants
    const notSelectedEmailDetails = {
      to: notSelectedEmailAddresses,
      usernames: notSelectedUsernames,
    };
  
    console.log("Selected email details:", selectedEmailDetails);
    console.log("Not selected email details:", notSelectedEmailDetails);
  
    try {
      // Check if no participants are selected and show a message
      if (selectedParticipants.length === 0 && type === 'selected') {
        toast.error("No participants are selected.");
        return; // Exit early if no participants are selected
      }
  
      // Conditionally send emails based on the type argument
      if (type === 'selected') {
        // Send emails to selected participants
        const selectedResponse = await fetch('/api/sendselectedEmail', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`, // Include token if required
          },
          body: JSON.stringify(selectedEmailDetails),
        });
  
        const selectedResponseText = await selectedResponse.text(); // Debugging raw response
        console.log("Selected Response:", selectedResponseText);
  
        if (selectedResponse.ok) {
          toast.success(`Emails sent to ${selectedEmailAddresses.length} selected participants!`);
        } else {
          const errorResponse = JSON.parse(selectedResponseText);
          toast.error(`Failed to send emails to selected participants: ${errorResponse.message || "Unknown error"}`);
        }
      } else if (type === 'rejected') {
        // Send emails to not selected participants
        const notSelectedResponse = await fetch('/api/sendnotselectedEmail', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`, // Include token if required
          },
          body: JSON.stringify(notSelectedEmailDetails),
        });
  
        const notSelectedResponseText = await notSelectedResponse.text(); // Debugging raw response
        console.log("Not Selected Response:", notSelectedResponseText);
  
        if (notSelectedResponse.ok) {
          toast.success(`Emails sent to ${notSelectedEmailAddresses.length} not selected participants!`);
        } else {
          const errorResponse = JSON.parse(notSelectedResponseText);
          toast.error(`Failed to send emails to not selected participants: ${errorResponse.message || "Unknown error"}`);
        }
      } else {
        // If 'type' is not recognized, you can either handle both or give a warning
        toast.error("Invalid type specified. Please use 'selected' or 'notselected'.");
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Something went wrong while sending emails.');
    }
  };
  
  
  
  
  const handleDownloadExcelClick = () => {
    setIsSheetOpen(true);
    // Assuming the response gives the correct Cloudinary URL
  
// Open the sheet when "Download Excel" is clicked
  };

const handledownload = async () => {
  try {
    const response = await fetch('/api/generateExcel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(participants), // Send participants data
    });

    const result = await response.json();
    if (result.success) {
      const cloudinaryUrl = result.url;


    // Create an anchor element
    const link = document.createElement("a");
    link.href = cloudinaryUrl;
    link.download = "participants.xlsx"; // Suggested filename

    // Append to body, trigger click, and remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
      toast.success('Excel file downloaded successfully!');
    } else {
      toast.error('Failed to generate Excel file.');
    }
  } catch (error) {
    console.error('Error:', error);
    toast.error('Something went wrong.');
  }
  setIsSheetOpen(false); // Close the sheet
};

  const handleSelectionChange = (updatedParticipant: Participant) => {
    // Update the participant in the state (or Firebase)
    setParticipants(prevParticipants =>
      prevParticipants.map(p =>
        p.id === updatedParticipant.id ? updatedParticipant : p
      )
    );
  };


  

  return (
    <>
      {/* Section for larger screens */}
      <section className="hidden lg:block text-foreground">
        <div className="mb-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold tracking-tight">Participation Selection</h2>
          </div>
          <div className="flex space-x-2">
            {/* Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Options</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsAlertOpen(true)}>
                  Send Rejected Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadExcelClick}>
                  Download Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

{/* Send Email Button */}
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
      <AlertDialogAction onClick={() => handleSendEmail('selected')}>Continue</AlertDialogAction> {/* Passing 'selected' to send emails to selected participants */}
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

{/* Alert Dialog for sending emails to rejected participants */}
<AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
  <AlertDialogTrigger asChild />
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will send emails to all rejected participants (those without the checkbox marked).
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={() => setIsAlertOpen(false)}>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => handleSendEmail('rejected')}>Continue</AlertDialogAction> {/* Passing 'rejected' to send emails to rejected participants */}
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

            {/* Sheet for Download Excel */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger />
              <SheetContent>
                <SheetHeader className="space-y-2">
                  <SheetTitle className="text-xl font-semibold">Hey {user.name} 🙋‍♂️ </SheetTitle>
                  <SheetDescription className="text-sm text-muted-foreground">
                    Download the data of student participants registered for TEDxSIST Feb 2025.<br/>
                  </SheetDescription>
                </SheetHeader>
                <Button onClick={handledownload} className="mt-4">Download Excel</Button>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <div className="-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-x-12 lg:space-y-0">
          <DataTableDemo participants={participants} onSelectionChange={handleSelectionChange} />
        </div>
      </section>

      

      

      {/* Section for mobile screens */}
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
  );
}
