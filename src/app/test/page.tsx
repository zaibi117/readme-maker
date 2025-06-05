"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ReactMarkdown from "react-markdown"

export default function SampleTemplatePage() {
    const markdownContent = `# DES Algorithm Implementation in C#

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/zohaibsaeed117/DES_Algorithm_Implementation?style=social)](https://github.com/zohaibsaeed117/DES_Algorithm_Implementation/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/zohaibsaeed117/DES_Algorithm_Implementation)](https://github.com/zohaibsaeed117/DES_Algorithm_Implementation/issues)

This project provides a C# implementation of the Data Encryption Standard (DES) algorithm, integrated into a Windows Forms application for encrypting and decrypting text within PDF files.  It leverages the iText7 library for PDF manipulation and provides a user-friendly interface for performing DES operations.

## Features

*   **DES Encryption:** Implements the DES encryption algorithm for secure data transformation.
*   **DES Decryption:** Implements the DES decryption algorithm to revert encrypted data back to its original form.
*   **PDF Integration:**  Encrypts and decrypts text extracted from PDF files.
*   **User-Friendly Interface:** Provides a simple Windows Forms application for easy interaction.
*   **Key Generation:** Generates subkeys required for each round of the DES algorithm.
*   **Base64 Encoding/Decoding:**  Uses Base64 encoding for ciphertext representation.

## Technologies Used

*   **Programming Language:** C#
*   **Framework:** .NET Framework (Windows Forms)
*   **Library:** iText7 (for PDF manipulation)

## Installation

1.  **Clone the repository:**

    \`\`\`bash
    git clone https://github.com/zohaibsaeed117/DES_Algorithm_Implementation.git
    \`\`\`

2.  **Open the project in Visual Studio:**

    Navigate to the cloned directory and open the \`DES.sln\` file with Visual Studio.

3.  **Install iText7 NuGet Package:**

    In Visual Studio, go to \`Tools\` -> \`NuGet Package Manager\` -> \`Manage NuGet Packages for Solution...\`.  Search for \`itext7\` and install the latest stable version.

4.  **Build the Solution:**

    Build the solution by going to \`Build\` -> \`Build Solution\`.

## Usage

1.  **Run the application:**

    After building the solution, run the application by pressing \`F5\` or clicking \`Debug\` -> \`Start Debugging\`.

2.  **Select a PDF file:**

    Click the "Upload File" button to select the PDF file you want to encrypt or decrypt.

3.  **Enter the key:**

    Enter the 8-character (64-bit) key in the provided text box.

4.  **Choose Encryption or Decryption:**

    Select either the "Encrypt" or "Decrypt" radio button.

5.  **Perform the Action:**

    Click the "Action" button to start the encryption or decryption process. A new PDF file containing the processed text will be created in the same directory as the original PDF.

## Project Structure

\`\`\`
DES_Algorithm_Implementation/
├── DES/
│   ├── Program.cs                # Main entry point of the application
│   ├── Form1.cs                  # Main form logic (UI and event handling)
│   ├── Form1.Designer.cs         # Main form UI design
│   ├── DES.cs                    # DES algorithm implementation
│   ├── Properties/
│   │   ├── AssemblyInfo.cs       # Assembly metadata
│   │   ├── Resources.resx          # Resources file
│   │   ├── Resources.Designer.cs   # Resources class
│   │   ├── Settings.settings       # Application settings
│   │   ├── Settings.Designer.cs    # Application settings class
│   ├── DES.csproj                # Project file
├── README.md                   # This file
├── .gitignore                  # Specifies intentionally untracked files that Git should ignore
└── LICENSE                     # License file
\`\`\`

## Contributing

Contributions are welcome! Please follow these guidelines:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and commit them with clear, descriptive messages.
4.  Submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.`;


    return (
        <div className="container mx-auto px-4 py-8">
            <Card>
                <CardHeader>
                    <CardTitle>Markdown Viewer</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="markdown-container">
                        <ReactMarkdown
                            components={{
                                h1: ({ children }) => <h1 className="text-3xl font-bold mb-4 text-gray-900">{children}</h1>,
                                h2: ({ children }) => (
                                    <h2 className="text-2xl font-semibold mb-3 mt-6 text-gray-800">{children}</h2>
                                ),
                                h3: ({ children }) => <h3 className="text-xl font-medium mb-2 mt-4 text-gray-700">{children}</h3>,
                                p: ({ children }) => <p className="mb-4 text-gray-600 leading-relaxed">{children}</p>,
                                ul: ({ children }) => (
                                    <ul className="list-disc list-inside inline mb-4 space-y-1 text-gray-600">{children}</ul>
                                ),
                                ol: ({ children }) => (
                                    <ol className="list-decimal  list-inside mb-4 space-y-1 text-gray-600">{children}</ol>
                                ),
                                li: ({ children }) => <li className="text-gray-600">{children}</li>,
                                blockquote: ({ children }) => (
                                    <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-4">
                                        {children}
                                    </blockquote>
                                ),
                                a: ({ href, children }) => (
                                    <a
                                        href={href}
                                        className="text-blue-600 hover:text-blue-800 underline"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {children}
                                    </a>
                                )
                            }}
                        >
                            {markdownContent}
                        </ReactMarkdown>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

