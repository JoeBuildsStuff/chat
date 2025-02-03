import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ToolCallProps {
  toolName: string;
  parameters?: string;
  result?: string;
}

export const ToolCall: React.FC<ToolCallProps> = ({ toolName, parameters, result }) => {
  return (
    <Card className="my-2 bg-secondary/50">
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium">🛠️ Tool: {toolName}</CardTitle>
      </CardHeader>
      {parameters && (
        <CardContent className="py-2 space-y-2">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Parameters:</div>
            <pre className="text-sm bg-secondary/50 p-2 rounded-md overflow-x-auto">
              {parameters}
            </pre>
          </div>
          {result && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Result:</div>
              <pre className="text-sm bg-secondary/50 p-2 rounded-md overflow-x-auto">
                {result}
              </pre>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};