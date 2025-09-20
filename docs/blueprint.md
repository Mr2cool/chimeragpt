# **App Name**: Nano GitHub Viewer

## Core Features:

- Repository Fetch: Fetch the provided GitHub repository metadata from the provided URL.
- Readme Render: Parse and render the README.md file. LLM as a tool, determine if it needs to add an intro before the markdown body. If yes, create a short professional and friendly intro based on the repository metadata
- Directory Structure Display: Display the directory structure of the GitHub repository, generated dynamically at the top of the page.
- Dependency List: Lists dependencies specified in package.json or similar manifest files
- File search: Lets users type in a filename, or some part of a filename, and then jumps the display to that file or directory

## Style Guidelines:

- Primary color: Soft blue (#64B5F6) to give a friendly tech feel
- Background color: Light grey (#F0F4F8) for a clean and readable layout.
- Accent color: Light Green (#A5D6A7) for interactive elements and highlights, such as buttons and links.
- Font pairing: 'Space Grotesk' (sans-serif) for headlines and 'Inter' (sans-serif) for body text.
- Use simple, outline-style icons for folders and files in the directory structure.
- Use a clean, left-aligned layout for readability and ease of navigation. Ensure sufficient spacing between elements.
- Use subtle transition animations when navigating through the directory structure or opening files.