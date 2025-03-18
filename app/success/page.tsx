import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"

export default function SuccessPage() {
  return (
    <div className="container flex items-center justify-center min-h-screen py-10">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Upload Successful!</CardTitle>
          <CardDescription>Your files have been successfully uploaded to Google Drive</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-4">
            Thank you for using our upload portal. Your photography files have been received and saved to our Google
            Drive.
          </p>
          <div className="p-4 bg-muted rounded-md text-sm">
            <p className="font-medium mb-2">What happens next?</p>
            <ul className="text-left list-disc pl-5 space-y-1">
              <li>Our team will process your photos</li>
              <li>We'll organize them according to the number of sheets you specified</li>
              <li>You'll receive a confirmation email when processing is complete</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/">
            <Button>Upload More Files</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}

