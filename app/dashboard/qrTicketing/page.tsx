'use client';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import QRScanner from '@/components/QRScanner';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast } from "sonner";
const ParentComponent = () => {
  const router = useRouter();
  const token = sessionStorage.getItem('Token');
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [qrResult, setQrResult] = useState('None');
  const [qrResultTimestamp, setQrResultTimestamp] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [data, setData] = useState<any | null>(null); // Hold data from API response for display
  const [isAttendanceMarked, setIsAttendanceMarked] = useState(false); // Track if attendance is marked

  useEffect(() => {
    if (token) {
      try {
        const decodedToken = jwtDecode<{ name: string; email: string }>(token);
        setUser(decodedToken);
      } catch (error) {
        console.error('Invalid token:', error);
        setUser(null);
      }
    }
  }, [token]);

  // Callback function to handle the scanned result and timestamp
  const handleScan = async (result: string, timestamp: string) => {
  setQrResult(result);
  setQrResultTimestamp(timestamp);
  setIsDialogOpen(false);

  // Corrected URL to pass qrResult as query parameter
  try {
    const response = await fetch(`/api/markAttendance?qrResult=${encodeURIComponent(result)}`);

    if (response.ok) {
      const participantData = await response.json();
      setData(participantData);
    } else {
      console.error('Participant not found');
    }
  } catch (error) {
    console.error('Error fetching participant data:', error);
  }
};



  // Function to mark attendance
  const handleMarkAttendance = async () => {
  try {
    const response = await fetch('/api/markAttendance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ qrResult, qrResultTimestamp }),
    });

    if (response.ok) {
      const responseData = await response.json();
      setData(responseData); // Update UI with marked attendance data
      setIsAttendanceMarked(false); // Allow button to be clicked again

      // Clear participant data after marking attendance
      setData(null); // Reset data to null to clear the name and email
      setQrResult('None'); // Reset QR result for the next scan
      setQrResultTimestamp(''); // Clear timestamp
      if (user) {
          toast.success(`Hey ${user.name}, your attendance has been marked successfully!`);
        }
    } else {
      console.error('Failed to mark attendance');
    }
  } catch (error) {
    console.error('Error marking attendance:', error);
  }
};


  return (
    <>
      {/* Mobile View */}
      <section className="lg:hidden text-foreground">
        <div className="text-foreground">
          <Card className="w-auto">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center justify-between">
                  <span>Participant Details</span>
                  <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button onClick={() => setIsDialogOpen(true)}>Scan</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Scan QR Code</AlertDialogTitle>
                        <AlertDialogDescription>
                          Use the QR scanner below to scan a QR code and retrieve the result.
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <div id="qr-scanner-container">
                        <QRScanner onScan={handleScan} />
                      </div>

                      <AlertDialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardTitle>
              <CardDescription>Card Description</CardDescription>
            </CardHeader>

            <CardContent>
              <div>
                {/* Display Scanned QR Details */}
                <div className="mt-4 space-y-2 text-sm text-gray-800">
                  <div>
                    <b>Id:</b> <span className="text-gray-600">{qrResult}</span>
                  </div>
                  <div>
                    <b>Name:</b> <span className="text-gray-600">{data?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <b>Email:</b> <span className="text-gray-600">{data?.email || 'N/A'}</span>
                  </div>
                  <div>
                    <b>Time:</b> <span className="text-gray-600">{qrResultTimestamp}</span>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                onClick={handleMarkAttendance}
                disabled={isAttendanceMarked} // Disable if attendance is already marked
              >
                <Check /> {isAttendanceMarked ? 'Attendance Marked' : 'Mark Attendance'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Desktop View */}
      <section className="hidden lg:block text-foreground">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mb-16 items-center justify-center text-center">
          <span className="bg-gradient-to-b from-foreground to-transparent bg-clip-text text-[10rem] font-extrabold leading-none text-transparent">
            403
          </span>
          <h2 className="my-2 font-heading text-2xl font-bold">
            Hey {user?.name || 'Guest'}
          </h2>
          <p>Probably you are using a desktop view. Please switch to mobile view for this page.</p>
          <div className="mt-8 flex justify-center gap-2">
            <Button onClick={() => router.push('/dashboard')} variant="default" size="lg">
              Go back
            </Button>
            <Button onClick={() => router.push('/dashboard')} variant="ghost" size="lg">
              Back to Home
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

export default ParentComponent;
