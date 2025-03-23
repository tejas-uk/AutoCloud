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
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
        <div className="flex items-center space-x-2">
          <Cloud className="h-5 w-5 text-white" />
          <h3 className="text-lg font-semibold text-white">Azure Hosting Recommendations</h3>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Service Categories */}
          <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
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
          
          {/* Generate Button */}
          <div className="md:col-span-1 flex flex-col justify-center items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full">
                    <Button
                      onClick={onGenerateRecommendations}
                      disabled={isLoading || isDisabled}
                      onMouseEnter={() => setHovered(true)}
                      onMouseLeave={() => setHovered(false)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 font-medium text-base shadow-md transition-all hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none rounded-md"
                    >
                      <Cloud className="mr-2 h-5 w-5" />
                      {isLoading ? "Generating..." : "Generate Azure Recommendations"}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Generate Azure service recommendations based on repository analysis</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
              AI-based recommendations for hosting your application on Microsoft Azure
            </p>
          </div>
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