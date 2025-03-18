"use client"

import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { X, Upload, File, Folder } from "lucide-react"
import { formatFileSize } from "@/lib/utils"

interface FileUploaderProps {
  files: File[]
  setFiles: (files: File[]) => void
  acceptFolders?: boolean
}

export function FileUploader({ files, setFiles, acceptFolders = false }: FileUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Process all files, including those from folders
      const newFiles = [...files, ...acceptedFiles]
      setFiles(newFiles)
    },
    [files, setFiles],
  )

  const removeFile = (index: number) => {
    const newFiles = [...files]
    newFiles.splice(index, 1)
    setFiles(newFiles)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: false,
    noKeyboard: false,
    multiple: true,
    accept: {
      "application/zip": [".zip"],
      "application/x-zip-compressed": [".zip"],
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/tiff": [".tiff", ".tif"],
      "image/raw": [".raw", ".cr2", ".nef", ".arw"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "video/mp4": [".mp4"],
      "video/quicktime": [".mov"],
    },
    useFsAccessApi: true,
    noDrag: false,
    noDragEventsBubbling: false,
    ...(acceptFolders ? { directory: true, webkitdirectory: true } : {}),
  })

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2">
          {acceptFolders ? (
            <Folder className="h-10 w-10 text-muted-foreground" />
          ) : (
            <Upload className="h-10 w-10 text-muted-foreground" />
          )}
          {isDragActive ? (
            <p>Drop the {acceptFolders ? "folder" : "files"} here...</p>
          ) : (
            <>
              <p className="text-sm font-medium">
                {acceptFolders
                  ? "Drag & drop a folder here, or click to select a folder"
                  : "Drag & drop files here, or click to select files"}
              </p>
              <p className="text-xs text-muted-foreground">
                Supports large files (up to 30GB), ZIP archives, RAW photos, and more
              </p>
            </>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Selected Files</h3>
          <div className="max-h-60 overflow-y-auto">
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li key={index} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center space-x-2 overflow-hidden">
                    <File className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      ({formatFileSize(file.size)})
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFile(index)}>
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove file</span>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

