import fs from "node:fs"
import path from "node:path"
import dotenv from "dotenv"
import ignore, { type Ignore } from "ignore"

dotenv.config({ path: ".env" })

type CodeSyncConfig = {
    base_url: string
    agent_id: string
    instructions: string
    directory: string
    gitignore: boolean
    extensions: string[]
    ignore: string[]
}

// Load the configuration from code-sync.config.json
async function loadConfig() {
    const configPath = path.join(process.cwd(), "code-sync.config.json")

    if (!fs.existsSync(configPath)) {
        throw new Error("Configuration file not found: code-sync.config.json")
    }

    const configContent = await fs.promises.readFile(configPath, "utf8")
    return JSON.parse(configContent)
}

// Function to read .gitignore files and create an ignore instance
async function getIgnoredFiles(ig: Ignore, cwd: string) {
    const gitignorePath = path.join(cwd, ".gitignore")

    // Check if .gitignore file exists
    if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = await fs.promises.readFile(gitignorePath, "utf8")
        ig.add(gitignoreContent)
    }

    return ig
}

// Function to recursively append file contents to a large string
async function appendFilesRecursively(dir: string, config: CodeSyncConfig, ig: Ignore) {
    let largeString = ""

    // Read directory contents
    const files = await fs.promises.readdir(dir, { withFileTypes: true })

    for (const file of files) {
        const filePath = path.join(dir, file.name)

        if (ig.ignores(path.relative(process.cwd(), filePath))) {
            continue // Skip ignored files and directories
        }

        if (file.isDirectory()) {
            largeString += await appendFilesRecursively(filePath, config, ig)
        } else if (file.isFile()) {
            // Check file extension
            const ext = path.extname(file.name).slice(1) // Get extension without the dot
            if (config.extensions.includes(ext)) {
                // Generate relative file path from the current working directory
                const relativeFilePath = path.relative(process.cwd(), filePath)
                // Append file path and name
                largeString += `\n\n/${relativeFilePath}\n\n`

                // Read file content and append to large string
                const fileContent = await fs.promises.readFile(filePath, "utf8")
                largeString += fileContent
            }
        }
    }

    return largeString
}

// Function to send a PATCH request
const codeSync = async () => {
    try {
        const config = await loadConfig()
        const currentDir = path.resolve(config.directory)
        const ig = ignore()

        if (config.gitignore) {
            await getIgnoredFiles(ig, currentDir)
        }

        // Add additional ignore rules from config
        ig.add(config.ignore)
        ig.add(["code-sync.js", "code-sync.config.json"])

        let instructions = `${config.instructions}\n\nContext:`
        instructions += await appendFilesRecursively(currentDir, config, ig)

        const currentTime = new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "numeric",
            second: "numeric"
        })

        try {
            const response = await fetch(`${config.base_url}/api/agents/${config.agent_id}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${process.env.AQUARION_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ instructions })
            })

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`)
            }

            console.info(currentTime, "Code Synced Successfully")
        } catch (error) {
            console.error(currentTime, "Code Sync Failed", (error as Error).message)
        }
    } catch (error) {
        console.error("Error:", (error as Error).message)
    }
}

codeSync()
