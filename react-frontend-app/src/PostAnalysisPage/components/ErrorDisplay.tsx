import React from "react";
import { APIError } from "../types/types";
import { AlertCircle } from "lucide-react";

const ErrorDisplay: React.FC<{ error: APIError; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
    <div className="flex items-center">
      <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
      <div className="flex-1">
        <h3 className="text-red-800 font-medium">Error</h3>
        <p className="text-red-700 text-sm">{error.message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
        >
          Retry
        </button>
      )}
    </div>
  </div>
);
export default ErrorDisplay;