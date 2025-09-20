"use client"; 

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Something went wrong!</CardTitle>
                <CardDescription>
                    {error.message || "An unexpected error occurred."}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button
                    onClick={
                    () => reset()
                    }
                >
                    Try again
                </Button>
            </CardContent>
        </Card>
    </main>
  );
}
