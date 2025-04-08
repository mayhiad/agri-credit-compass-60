
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepsProps {
  steps: string[];
  currentStep: number;
}

export const Steps = ({ steps, currentStep }: StepsProps) => {
  return (
    <div className="flex w-full justify-between">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;
        
        return (
          <div key={idx} className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium",
                isCompleted 
                  ? "border-green-500 bg-green-500 text-white" 
                  : isCurrent
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-gray-300 bg-white text-gray-500"
              )}
            >
              {isCompleted ? <Check className="h-5 w-5" /> : idx + 1}
            </div>
            <span 
              className={cn(
                "mt-2 max-w-[100px] text-center text-xs sm:text-sm", 
                isCompleted || isCurrent ? "font-medium" : "text-gray-500",
                isCompleted ? "text-green-600" : isCurrent ? "text-primary" : ""
              )}
            >
              {step}
            </span>
            {idx < steps.length - 1 && (
              <div 
                className={cn(
                  "absolute -z-10 h-0.5 w-[calc(100%-30px)] translate-y-5 transform",
                  isCompleted ? "bg-green-500" : "bg-gray-300"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Steps;
