import { writeFile, readFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import { join } from "path"

// Ensure the sessions directory exists
const SESSIONS_DIR = join(process.cwd(), "tmp", "sessions")

// Initialize the sessions directory
export async function initSessionStore() {
  if (!existsSync(SESSIONS_DIR)) {
    await mkdir(SESSIONS_DIR, { recursive: true })
  }
}

// Save a session
export async function saveSession(id: string, data: any) {
  await initSessionStore()
  const sessionPath = join(SESSIONS_DIR, `${id}.json`)
  await writeFile(sessionPath, JSON.stringify(data))
}

// Get a session
export async function getSession(id: string) {
  await initSessionStore()
  const sessionPath = join(SESSIONS_DIR, `${id}.json`)

  try {
    if (existsSync(sessionPath)) {
      const data = await readFile(sessionPath, "utf-8")
      return JSON.parse(data)
    }
  } catch (error) {
    console.error("Error reading session:", error)
  }

  return null
}

// Update a session
export async function updateSession(id: string, updater: (data: any) => any) {
  const session = await getSession(id)
  if (session) {
    const updatedSession = updater(session)
    await saveSession(id, updatedSession)
    return updatedSession
  }
  return null
}

