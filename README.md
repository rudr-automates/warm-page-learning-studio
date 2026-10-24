# Welcome to your Lovable project

## Horizon 2.0 prototype status

Foundation and Learning Studio are implemented. Sign in, open **Courses** from the dashboard, and start the original grounded-AI demonstration course. Personal notes, bookmarks and progress use owner-protected Supabase records. Phase 3 will connect external LLM APIs; no Lovable AI Gateway is integrated.

See [Learning Studio setup, sample resources, portability and validation](docs/LEARNING_STUDIO.md). Independent deployments must rehost the sample media and update its pointers and lesson video URLs. Set the existing Supabase environment variables, apply `supabase/migrations` in order, install with `bun install`, and run `bun run dev`. Test with `bun run test`. Signed-in flows remain manually unverified with the externally managed Supabase connection.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
