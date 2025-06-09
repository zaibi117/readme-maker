# Readme Generator

A Next.js application that automatically generates README files for GitHub repositories. It analyzes the repository's code, provides summaries, and creates a comprehensive README based on the project's structure and content.

## Features

- **Automated README Generation:** Analyzes a GitHub repository and generates a README file.
- **Code Summarization:** Provides summaries of individual code files and chunks.
- **Customizable:** Allows for customization of the generated README content.
- **GitHub Integration:** Seamlessly integrates with GitHub to fetch repository data.
- **User Authentication:** Secure user authentication via GitHub OAuth.
- **Rate Limiting:** Implements rate limiting to prevent abuse.
- **Premium Features:** Offers premium features like increased usage limits.
- **Theme Support:** Supports light and dark themes.
- **Caching:** Caches summaries to improve performance and reduce API calls.
- **User History:** Provides a history of generated README files for each user.

## Technologies Used

- **Next.js:** React framework for building server-rendered applications.
- **React 19:** JavaScript library for building user interfaces.
- **TypeScript:** Superset of JavaScript that adds static typing.
- **Radix UI:** Unstyled, accessible UI components.
- **Tailwind CSS:** Utility-first CSS framework.
- **clsx:** Utility for constructing `className` strings conditionally.
- **tailwind-merge:** Utility for resolving Tailwind CSS class conflicts.
- **date-fns:** Modern JavaScript date utility library.
- **lucide-react:** Beautifully simple vector icons.
- **react-markdown:** React component for rendering Markdown.
- **react-syntax-highlighter:** React component for syntax highlighting.
- **Mongoose:** MongoDB object modeling tool.
- **NextAuth.js:** Authentication library for Next.js.
- **Next Themes:** Theme management for Next.js.
- **MongoDB:** NoSQL database.

## Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/zohaibsaeed117/readme-maker.git
    cd readme-maker
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

3.  **Set up environment variables:**

    Create a `.env.local` file in the root directory and add the following environment variables:

    ```
    MONGODB_URI=<your_mongodb_uri>
    GITHUB_ID=<your_github_app_id>
    GITHUB_SECRET=<your_github_app_secret>
    NEXTAUTH_SECRET=<a_secure_random_string>
    NEXT_PUBLIC_BASE_URL=http://localhost:3000 # or your deployed URL
    ```

    Replace the placeholders with your actual values.  You'll need to create a GitHub OAuth App and a MongoDB database.

4.  **Run the development server:**

    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```

    Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## Usage

1.  **Login:**

    Click the "Login with GitHub" button to authenticate with your GitHub account.

2.  **Enter Repository URL:**

    Enter the URL of the GitHub repository you want to generate a README for in the input field on the homepage.

3.  **Generate README:**

    Click the "Generate README" button. The application will analyze the repository and generate a README file.

4.  **View README:**

    The generated README will be displayed in the `ReadmeViewer` component.

## Project Structure

```
readme-maker/
├── .next/                 # Next.js build output
├── src/                    # Source code
│   ├── app/                # Next.js app directory
│   │   ├── api/            # API routes
│   │   │   ├── auth/       # Authentication routes
│   │   │   ├── user/       # User-related routes
│   │   │   ├── premium/    # Premium feature routes
│   │   │   └── readme/     # README generation route
│   │   ├── repositories/  # Repository page
│   │   ├── login/         # Login page
│   │   └── layout.tsx      # Root layout
│   ├── components/         # React components
│   │   ├── ui/             # Radix UI components
│   │   ├── breadcrumb.tsx  # Breadcrumb component
│   │   ├── readme-viewer.tsx # Component to display the generated README
│   │   ├── repository-processor.tsx # Main component for processing repositories
│   │   ├── session-provider.tsx # Session provider component
│   │   ├── summaries-list.tsx # Component to display summaries
│   │   ├── theme-provider.tsx # Theme provider component
│   │   └── usage-limit-alert.tsx # Alert component for usage limits
│   ├── constants/          # Constant values
│   │   └── file-filters.ts # File filters
│   ├── hooks/              # React hooks
│   │   ├── use-premium.ts  # Premium hook
│   │   ├── use-repository-processor.ts # Hook for repository processing logic
│   │   └── use-user-limits.ts # User limits hook
│   ├── lib/                # Utility functions
│   │   ├── auth.ts         # Authentication configuration
│   │   ├── mongodb.ts      # MongoDB connection
│   │   ├── rate-limiter.ts # Rate limiter implementation
│   │   └── utils.ts        # Utility functions
│   ├── models/             # Mongoose models
│   │   ├── readme.ts       # Readme model
│   │   ├── summary-cache.ts # Summary cache model
│   │   └── user.ts         # User model
│   ├── types/              # TypeScript types
│   │   ├── next-auth.d.ts  # NextAuth types
│   │   └── repository.ts   # Repository types
│   └── styles/             # Global styles
│       └── globals.css     # Global CSS file
├── public/                 # Public assets
├── components.json         # UI component configuration
├── next.config.ts          # Next.js configuration
├── package.json            # Project dependencies
├── postcss.config.js       # PostCSS configuration
├── README.md               # This file
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Contributing

We welcome contributions to the Readme Generator project! Please follow these guidelines:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and commit them with clear, concise messages.
4.  Submit a pull request to the main branch.

## License

This project is licensed under the [MIT License](LICENSE).
