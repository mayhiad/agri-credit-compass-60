
import { cn } from "@/lib/utils";
import { Check, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface StepsProps {
  steps: string[];
  currentStep: number;
}

export const Steps = ({ steps, currentStep }: StepsProps) => {
  return (
    <div className="w-full">
      <div className="relative flex justify-between">
        {/* Connecting line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2 z-0"></div>
        
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;
          
          return (
            <motion.div 
              key={idx} 
              className="flex flex-col items-center relative z-10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-medium shadow-sm transition-all duration-200",
                  isCompleted 
                    ? "border-green-500 bg-green-500 text-white" 
                    : isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-gray-200 bg-white text-gray-400"
                )}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : <span>{idx + 1}</span>}
              </div>
              
              <span 
                className={cn(
                  "mt-3 max-w-[100px] text-center text-xs sm:text-sm transition-colors duration-200", 
                  isCompleted ? "font-medium text-green-600" : 
                  isCurrent ? "font-medium text-primary" : 
                  "text-gray-500"
                )}
              >
                {step}
              </span>
              
              {idx < steps.length - 1 && (
                <div className="absolute top-6 left-[calc(100%+0.75rem)] -translate-y-1/2 text-gray-300 hidden md:block">
                  <ArrowRight className="h-5 w-5" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Steps;
