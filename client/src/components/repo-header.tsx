import { Github } from "lucide-react";

interface RepoHeaderProps {
  repoName: string;
}

export function RepoHeader({ repoName }: RepoHeaderProps) {
  return (
    <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-md">
      <Github className="h-4 w-4" />
      <span className="text-sm font-medium">{repoName}</span>
    </div>
  );
}
