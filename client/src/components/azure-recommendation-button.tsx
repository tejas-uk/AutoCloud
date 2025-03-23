import { useState } from "react";
import { Cloud, Server, Cpu, Database, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AzureRecommendationButtonProps {
  onGenerateRecommendations: () => void;
  isLoading: boolean;
  isDisabled?: boolean;
}

export function AzureRecommendationButton({
  onGenerateRecommendations,
  isLoading,
  isDisabled = false,
}: AzureRecommendationButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Card className="overflow-hidden border-blue-100 dark:border-blue-900 mb-8">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Azure Hosting Recommendations
            </h3>
            <p className="text-sm text-white/90">
              AI-based recommendations for hosting your application on Microsoft Azure
            </p>
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full md:w-auto">
                  <Button
                    onClick={onGenerateRecommendations}
                    disabled={isLoading || isDisabled}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    className="w-full md:w-auto bg-white text-blue-600 hover:bg-white/90 hover:text-blue-700 shadow-sm"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Cloud className="mr-2 h-5 w-5" />
                        Generate Azure Recommendations
                      </>
                    )}
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Generate Azure service recommendations based on repository analysis</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <div className="p-6 bg-white dark:bg-slate-800">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ServiceCard 
            title="Compute"
            icon={<Cpu className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
            description="App Service, Functions, Containers"
            active={hovered}
          />
          <ServiceCard 
            title="Databases"
            icon={<Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
            description="SQL, Cosmos DB, PostgreSQL"
            active={hovered}
          />
          <ServiceCard 
            title="Networking"
            icon={<Globe className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
            description="CDN, API Management, Load Balancer"
            active={hovered}
          />
          <ServiceCard 
            title="Hosting"
            icon={<Server className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
            description="Web Apps, Static Web Apps"
            active={hovered}
          />
        </div>
      </div>
    </Card>
  );
}

interface ServiceCardProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  active: boolean;
}

function ServiceCard({ title, icon, description, active }: ServiceCardProps) {
  return (
    <div 
      className={cn(
        "p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center bg-white dark:bg-slate-800 transition-all duration-300",
        active && "border-blue-300 dark:border-blue-700 shadow-md"
      )}
    >
      <div className={cn(
        "mb-2 transition-transform duration-300", 
        active && "scale-110"
      )}>
        {icon}
      </div>
      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1">{title}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}