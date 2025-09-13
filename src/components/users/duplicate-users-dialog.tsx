
"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, getDocs, doc, writeBatch, Timestamp } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
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
import { Loader2, UserX, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DuplicateUsersDialogProps {
    onDuplicatesDeleted: () => void;
}

export default function DuplicateUsersDialog({ onDuplicatesDeleted }: DuplicateUsersDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [duplicateUsers, setDuplicateUsers] = useState<User[]>([]);
    const { toast } = useToast();

    const findDuplicateUsers = async () => {
        setLoading(true);
        setDuplicateUsers([]);
        try {
            const usersRef = collection(db, 'users');
            const querySnapshot = await getDocs(usersRef);
            
            const usersByAddress: { [key: string]: User[] } = {};
            
            querySnapshot.forEach((doc) => {
                const user = { id: doc.id, ...doc.data() } as User;
                if (user.bep20_address && typeof user.bep20_address === 'string') {
                    const normalizedAddress = user.bep20_address.trim().toLowerCase();
                    if (!usersByAddress[normalizedAddress]) {
                        usersByAddress[normalizedAddress] = [];
                    }
                    usersByAddress[normalizedAddress].push(user);
                }
            });

            const duplicates: User[] = [];
            for (const address in usersByAddress) {
                if (usersByAddress[address].length > 1) {
                    // Sort by creation date to find the original, handling undefined timestamps
                    const sortedUsers = usersByAddress[address].sort((a, b) => {
                        const timeA = a.created_at as Timestamp | undefined;
                        const timeB = b.created_at as Timestamp | undefined;
                        
                        if (timeA && timeB) {
                            return timeA.toMillis() - timeB.toMillis();
                        }
                        if (timeA) return -1; // a is older
                        if (timeB) return 1; // b is older
                        return 0; // both have no timestamp
                    });
                    
                    // The first one is original, the rest are duplicates
                    duplicates.push(...sortedUsers.slice(1));
                }
            }
            setDuplicateUsers(duplicates);

            if (duplicates.length === 0 && isOpen) {
                 toast({
                    title: "No Duplicates Found",
                    description: "Scanned all users and found no accounts with duplicate BEP20 addresses.",
                });
            }

        } catch (error) {
            console.error("Error finding duplicate users:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to scan for duplicate users.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDuplicates = async () => {
        if (duplicateUsers.length === 0) return;
        setDeleting(true);
        
        try {
            const batch = writeBatch(db);
            duplicateUsers.forEach(user => {
                const userRef = doc(db, 'users', user.id);
                batch.delete(userRef);
            });
            await batch.commit();
            
            toast({
                title: "Success",
                description: `${duplicateUsers.length} duplicate users have been deleted.`,
            });

            setDuplicateUsers([]);
            onDuplicatesDeleted(); // Callback to refresh data on the main page
            setIsOpen(false);

        } catch (error) {
            console.error("Error deleting duplicate users:", error);
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: "There was a problem deleting the duplicate users.",
            });
        } finally {
            setDeleting(false);
        }
    };
    
    useEffect(() => {
        if(isOpen) {
            findDuplicateUsers();
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    Find Duplicates
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Duplicate Users</DialogTitle>
                    <DialogDescription>
                        List of users who have registered with a BEP20 address that is already in use. 
                        The first user who registered with an address is considered the original and is not shown.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-60">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="ml-2">Scanning for duplicates...</p>
                        </div>
                    ) : duplicateUsers.length > 0 ? (
                         <ScrollArea className="h-72">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Username</TableHead>
                                        <TableHead>BEP20 Address</TableHead>
                                        <TableHead>Join Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {duplicateUsers.map(user => (
                                        <TableRow key={user.id}>
                                            <TableCell>{user.name}</TableCell>
                                            <TableCell>@{user.username}</TableCell>
                                            <TableCell className="font-mono text-xs">{user.bep20_address}</TableCell>
                                            <TableCell>{user.joinDate}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         </ScrollArea>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-60 text-center text-muted-foreground">
                           <UserX className="h-10 w-10 mb-2" />
                           <p className="font-medium">No duplicate users found.</p>
                           <p className="text-sm">All users have unique BEP20 addresses.</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    {duplicateUsers.length > 0 && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={deleting}>
                                    {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    Delete All ({duplicateUsers.length})
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete {duplicateUsers.length} user(s) from the database.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteDuplicates} disabled={deleting}>
                                        {deleting ? 'Deleting...' : 'Continue'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
