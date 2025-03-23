import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Github } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SourceSelectorProps {
  onSourceSelected: (repoUrl: string) => void;
  isLoading: boolean;
}

export function SourceSelector({ onSourceSelected, isLoading }: SourceSelectorProps) {
  const [sourceType, setSourceType] = useState<"url" | "oauth">("url");
  const [repoUrl, setRepoUrl] = useState("");
  const { toast } = useToast();

  const validateUrl = (url: string): boolean => {
    const githubRegex = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/;
    return githubRegex.test(url);
  };

  const connectGithubMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/auth/github", undefined);
      const data = await response.json();
      return data.authUrl;
    },
    onSuccess: (authUrl) => {
      window.location.href = authUrl;
    },
    onError: (error) => {
      toast({
        title: "Error connecting to GitHub",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (sourceType === "url") {
      if (!repoUrl) {
        toast({
          title: "Repository URL required",
          description: "Please enter a GitHub repository URL",
          variant: "destructive",
        });
        return;
      }

      if (!validateUrl(repoUrl)) {
        toast({
          title: "Invalid repository URL",
          description: "Please enter a valid GitHub repository URL (e.g., https://github.com/username/repository)",
          variant: "destructive",
        });
        return;
      }

      onSourceSelected(repoUrl);
    } else {
      connectGithubMutation.mutate();
    }
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Repository Source</h2>
      <Card>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* GitHub Link Option */}
            <div className="space-y-4">
              <RadioGroup
                value={sourceType}
                onValueChange={(value) => setSourceType(value as "url" | "oauth")}
                className="flex flex-col space-y-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="url" id="github-link" />
                  <Label htmlFor="github-link" className="font-medium">GitHub Repository URL</Label>
                </div>
              </RadioGroup>
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  placeholder="https://github.com/username/repository"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  disabled={sourceType !== "url" || isLoading}
                  className="w-full"
                />
                <Button
                  onClick={handleSubmit}
                  disabled={sourceType !== "url" || isLoading}
                  className="whitespace-nowrap"
                >
                  Analyze
                </Button>
              </div>
            </div>

            {/* GitHub Connect Option */}
            <div className="space-y-4">
              <RadioGroup
                value={sourceType}
                onValueChange={(value) => setSourceType(value as "url" | "oauth")}
                className="flex flex-col space-y-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="oauth" id="github-connect" />
                  <Label htmlFor="github-connect" className="font-medium">Connect GitHub Account</Label>
                </div>
              </RadioGroup>
              <Button
                variant="outline"
                onClick={handleSubmit}
                disabled={sourceType !== "oauth" || isLoading || connectGithubMutation.isPending}
                className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                <Github className="h-5 w-5" />
                <span>Connect with GitHub</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
