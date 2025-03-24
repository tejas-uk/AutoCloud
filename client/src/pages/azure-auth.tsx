import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function AzureAuthPage() {
  const { toast } = useToast();

  const handleSignIn = () => {
    // Redirect directly to the auth endpoint
    window.location.href = "/api/auth/azure";
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Connect with Azure</CardTitle>
          <CardDescription>
            Sign in with your Azure account to enable Azure deployments.
            This will allow the application to deploy resources to your Azure subscription.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button 
            onClick={handleSignIn}
            className="flex items-center gap-2"
            size="lg"
          >
            Sign in with Azure AD
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 