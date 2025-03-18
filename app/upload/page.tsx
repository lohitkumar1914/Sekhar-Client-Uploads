"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileUploader } from "@/components/file-uploader"
import { ArrowLeft, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function UploadPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [studioName, setStudioName] = useState("")
  const [numSheets, setNumSheets] = useState<number>(1)
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0)
  const [totalFiles, setTotalFiles] = useState<number>(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!studioName || numSheets < 1 || files.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields and upload at least one file",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    setTotalFiles(files.length)

    try {
      for (let i = 0; i < files.length; i++) {
        setCurrentFileIndex(i)
        const file = files[i]
        await uploadFileInChunks(file, studioName, numSheets, i)
      }

      router.push("/success")
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your files. Please try again.",
        variant: "destructive",
      })
      console.error("Error:", error)
    } finally {
      setIsSubmitting(false)
      setUploadProgress(0)
      setCurrentFileIndex(0)
    }
  }

  const uploadFileInChunks = async (file: File, studioName: string, numSheets: number, fileIndex: number) => {
    const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

    // Start the upload session
    const sessionResponse = await fetch("/api/upload/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        studioName,
        numSheets,
      }),
    })

    if (!sessionResponse.ok) {
      const errorData = await sessionResponse.json()
      throw new Error(errorData.error || "Failed to start upload session")
    }

    const sessionData = await sessionResponse.json()
    if (!sessionData.success) {
      throw new Error(sessionData.error || "Failed to start upload session")
    }

    const uploadId = sessionData.uploadId

    // Upload each chunk
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE
      const end = Math.min(file.size, start + CHUNK_SIZE)
      const chunk = file.slice(start, end)

      const formData = new FormData()
      formData.append("chunk", chunk)
      formData.append("uploadId", uploadId)
      formData.append("chunkIndex", chunkIndex.toString())
      formData.append("totalChunks", totalChunks.toString())

      const chunkResponse = await fetch("/api/upload/chunk", {
        method: "POST",
        body: formData,
      })

      if (!chunkResponse.ok) {
        const errorData = await chunkResponse.json()
        throw new Error(errorData.error || "Failed to upload chunk")
      }

      const chunkData = await chunkResponse.json()
      if (!chunkData.success) {
        throw new Error(chunkData.error || "Failed to upload chunk")
      }

      // Update progress
      const fileProgress = ((chunkIndex + 1) / totalChunks) * 100
      setUploadProgress(fileProgress)
    }

    // Complete the upload
    const completeResponse = await fetch("/api/upload/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uploadId,
      }),
    })

    if (!completeResponse.ok) {
      const errorData = await completeResponse.json()
      throw new Error(errorData.error || "Failed to complete upload")
    }

    const completeData = await completeResponse.json()
    if (!completeData.success) {
      throw new Error(completeData.error || "Failed to complete upload")
    }
  }

  return (
    <div className="container max-w-4xl py-10">
      <Link href="/" className="inline-flex items-center mb-6 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Upload Your Photos</CardTitle>
          <CardDescription>Please provide your studio information and upload your photography files</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="studio-name">Studio Name</Label>
              <Input
                id="studio-name"
                placeholder="Enter your studio name"
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="num-sheets">Number of Sheets</Label>
              <Input
                id="num-sheets"
                type="number"
                min="1"
                value={numSheets}
                onChange={(e) => setNumSheets(Number.parseInt(e.target.value) || 1)}
                required
              />
              <p className="text-xs text-muted-foreground">This will be added to the folder name for organization</p>
            </div>

            <div className="space-y-2">
              <Label>Upload Files</Label>
              <Tabs defaultValue="files" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="files">Individual Files</TabsTrigger>
                  <TabsTrigger value="folder">Entire Folder</TabsTrigger>
                </TabsList>
                <TabsContent value="files">
                  <FileUploader files={files} setFiles={setFiles} acceptFolders={false} />
                </TabsContent>
                <TabsContent value="folder">
                  <FileUploader files={files} setFiles={setFiles} acceptFolders={true} />
                </TabsContent>
              </Tabs>
              {files.length > 0 && <p className="text-sm text-muted-foreground">{files.length} files selected</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            {isSubmitting && (
              <div className="w-full space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    Uploading file {currentFileIndex + 1} of {totalFiles}
                  </span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground">Please don't close this window while uploading</p>
              </div>
            )}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Uploading..." : "Submit"}
              {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

