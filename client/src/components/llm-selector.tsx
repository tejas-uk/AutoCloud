import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { LLMModel } from "@/lib/types";

interface LLMSelectorProps {
  selectedModel: LLMModel;
  onModelSelected: (model: LLMModel) => void;
  disabled?: boolean;
}

export function LLMSelector({ selectedModel, onModelSelected, disabled = false }: LLMSelectorProps) {
  const models: Array<{
    id: LLMModel;
    name: string;
    description: string;
  }> = [
    {
      id: "gpt-4o-mini",
      name: "GPT-4o-mini",
      description: "Balanced speed and quality from OpenAI",
    },
    {
      id: "gpt-4o",
      name: "GPT-4o",
      description: "Highest quality from OpenAI",
    },
    {
      id: "o3-mini",
      name: "o3-mini",
      description: "Fast and efficient OpenAI option",
    },
    {
      id: "claude-3-7-sonnet",
      name: "Claude 3.7 Sonnet",
      description: "High quality analysis from Anthropic",
    },
  ];

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">LLM Model Selection</h2>
      <Card>
        <CardContent className="p-6">
          <RadioGroup
            value={selectedModel}
            onValueChange={(value) => onModelSelected(value as LLMModel)}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            disabled={disabled}
          >
            {models.map((model) => (
              <div
                key={model.id}
                className={`border rounded-md p-4 cursor-pointer transition-colors ${
                  selectedModel === model.id
                    ? "border-blue-500"
                    : "border-slate-200 dark:border-slate-700 hover:border-blue-500"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Label
                    htmlFor={`model-${model.id}`}
                    className="font-medium text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    {model.name}
                  </Label>
                  <RadioGroupItem
                    value={model.id}
                    id={`model-${model.id}`}
                    className="h-4 w-4"
                    disabled={disabled}
                  />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{model.description}</p>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}
