# Journal Cover AI

A React application that uses Google's Gemini models to generate professional scientific journal covers (Nature/Science style) from article abstracts, DOIs, or PDF uploads.

## Features

-   **AI Image Generation**: Uses `gemini-2.5-flash-image` and `gemini-3-pro-image-preview` to create stunning visuals.
-   **Content Analysis**: Automatically summarizes abstracts to create visual artistic prompts.
-   **Journal Layout**: Fully editable, drag-and-drop layout inspired by top-tier scientific journals.
-   **PDF/DOI Parsing**: Extract metadata automatically from PDFs or DOI numbers.
-   **High-Res Export**: Export print-ready PDFs (A4 size).

## Getting Started

This project is built to run directly in the browser using ES Modules (via `importmap`) or can be built using standard tools like Vite.

### Prerequisites

You need a Google Gemini API Key. Get one at [aistudio.google.com](https://aistudiocdn.com).

### Running Locally

1.  **Clone the repository**
2.  **Environment Setup**:
    This app expects the API key to be available via `process.env.API_KEY`.
    
    If using **Vite** (Recommended):
    - Create a `.env` file in the root.
    - Add `VITE_API_KEY=your_key_here`.
    - Update the `geminiService.ts` to use `import.meta.env.VITE_API_KEY` or configure your `vite.config.ts` to expose `process.env`.

    If running as **Static HTML**:
    - You will need to manually inject the key into the `window.process.env.API_KEY` object within `index.html` (not recommended for public deployment), or set up a secure backend proxy.

3.  **Install Dependencies** (if using a bundler)
    ```bash
    npm install
    npm start
    ```

## Usage

1.  **Input Data**: Paste your abstract, enter a DOI, or upload a PDF.
2.  **Configure**: Choose an art style (Realistic, Abstract, etc.) and aspect ratio.
3.  **Generate**: Click "Generate Cover Art".
4.  **Edit**:
    -   Click on text to edit.
    -   Use the **Layout Mode** to drag elements around.
    -   Use the **Refine** box to adjust the image (e.g., "Add more blue cells").
5.  **Export**: Download as PDF.

## Technologies

-   React 18
-   Tailwind CSS
-   Google GenAI SDK
-   html2canvas & jsPDF
