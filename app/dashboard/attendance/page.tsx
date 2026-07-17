'use client'
import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { useRouter } from "next/navigation";
import { jwtDecode, JwtPayload } from "jwt-decode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, UserX, Loader2 } from "lucide-react";

interface UserPayload extends JwtPayload {
  name: string;
  email: string;
}

export interface Participant {
  id: string;
  name: string;
  degree: string;
  department: string;
  email: string;
  attend?: boolean;
  entry_scanned?: boolean;
}

export default function AttendancePage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = sessionStorage.getItem('Token');
    if (token) {
      try {
        jwtDecode<UserPayload>(token);
      } catch (error) {
        console.error('Invalid token:', error);
        router.push('/');
      }
    } else {
      router.push('/');
    }
  }, [router]);

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const participantsCollection = collection(db, "participants");
      const participantSnapshot = await getDocs(participantsCollection);
      const participantList = participantSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Participant[];

      setParticipants(participantList);
    } catch (error) {
      console.error("Error fetching participants:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

  // Filter those who attended (checking attend or entry_scanned based on markEntry route)
  const attendees = participants.filter((p) => p.attend || p.entry_scanned);
  const notAttendedCount = participants.length - attendees.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Attendance Dashboard</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Overview of participant check-ins and attendance records.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Attendees
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{attendees.length}</div>
                <p className="text-xs text-muted-foreground">
                  Participants checked in
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Not Attended
                </CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{notAttendedCount}</div>
                <p className="text-xs text-muted-foreground">
                  Participants yet to check in
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Attendee List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Degree</TableHead>
                      <TableHead>Department</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                          No attendees found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      attendees.map((participant) => (
                        <TableRow key={participant.id}>
                          <TableCell className="font-medium">{participant.name}</TableCell>
                          <TableCell>{participant.degree}</TableCell>
                          <TableCell>{participant.department}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
