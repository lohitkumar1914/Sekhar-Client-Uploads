import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const studioName = formData.get("studioName") as string
    const files = formData.getAll("files") as File[]

    if (!studioName || files.length === 0) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Set up Google Drive authentication
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/drive"],
    })

    const drive = google.drive({ version: "v3", auth })

    // Create a folder for this studio
    const folderMetadata = {
      name: `${studioName} - ${new Date().toISOString().split("T")[0]}`,
      mimeType: "application/vnd.google-apps.folder",
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID as string],
    }

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: "id",
    })

    const folderId = folder.data.id

    if (!folderId) {
      throw new Error("Failed to create folder in Google Drive")
    }

    // Upload each file to the folder
    const uploadPromises = files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer())

      const fileMetadata = {
        name: file.name,
        parents: [folderId],
      }

      const media = {
        mimeType: file.type,
        body: buffer,
      }

      return drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id",
      })
    })

    await Promise.all(uploadPromises)

    return NextResponse.json({
      success: true,
      message: "Files uploaded successfully to Google Drive",
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ success: false, error: "Failed to upload files to Google Drive" }, { status: 500 })
  }
}

