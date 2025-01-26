import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PlusCircle, Save, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Types for our feed rules
export interface FeedRule {
  id: string;
  subject: "Posts" | "Pictures";
  verb: "posted" | "trending" | "commented" | "liked" | "interacted";
  predicate: "followers" | "nostr" | "tribe";
  timeRange: "1hr" | "4hr" | "12hr" | "24hr" | "7d";
  weight: number;
}

export interface AlgorithmBuilderProps {
  onSave: (rules: FeedRule[]) => void;
  initialRules?: FeedRule[];
}

const AlgorithmBuilder = ({
  onSave,
  initialRules = [],
}: AlgorithmBuilderProps) => {
  const [rules, setRules] = useState<FeedRule[]>(initialRules);
  const [error, setError] = useState<string>("");

  const subjects = ["Posts", "Pictures"] as const;
  const verbs = [
    "posted",
    // "trending",
    "commented",
    "liked",
    "interacted",
  ] as const;
  const predicates = ["followers", "nostr", "tribe"] as const;
  const timeRanges = ["1hr", "4hr", "12hr", "24hr", "7d"] as const;

  const addRule = () => {
    const newRule: FeedRule = {
      id: Date.now().toString(),
      subject: "Posts",
      verb: "liked",
      predicate: "followers",
      timeRange: "24hr",
      weight: 0,
    };
    setRules([...rules, newRule]);
    rebalanceWeights([...rules, newRule]);
  };

  const removeRule = (id: string) => {
    const newRules = rules.filter((rule) => rule.id !== id);
    setRules(newRules);
    rebalanceWeights(newRules);
  };

  const updateRule = (id: string, field: keyof FeedRule, value: any) => {
    const newRules = rules.map((rule) => {
      if (rule.id === id) {
        return { ...rule, [field]: value };
      }
      return rule;
    });
    setRules(newRules);
  };

  const rebalanceWeights = (currentRules: FeedRule[]) => {
    const totalRules = currentRules.length;
    if (totalRules === 0) return;

    const equalWeight = Math.floor(100 / totalRules);
    const remainder = 100 - equalWeight * totalRules;

    const balancedRules = currentRules.map((rule, index) => ({
      ...rule,
      weight: equalWeight + (index === 0 ? remainder : 0),
    }));

    setRules(balancedRules);
  };

  const validateRules = (): boolean => {
    if (rules.length === 0) {
      setError("At least one rule is required");
      return false;
    }

    const totalWeight = rules.reduce((sum, rule) => sum + rule.weight, 0);
    if (totalWeight !== 100) {
      setError("Weights must sum to 100%");
      return false;
    }

    setError("");
    return true;
  };

  const handleSave = () => {
    if (validateRules()) {
      onSave(rules);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Feed Algorithm Builder</span>
          <Button
            onClick={addRule}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4 bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {rules.map((rule, index) => (
            <div key={rule.id} className="p-4 border rounded-lg bg-gray-50">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Rule {index + 1}</h3>
                <Button
                  variant="ghost"
                  onClick={() => removeRule(rule.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Subject
                  </label>
                  <select
                    value={rule.subject}
                    onChange={(e) =>
                      updateRule(rule.id, "subject", e.target.value)
                    }
                    className="w-full p-2 border rounded"
                  >
                    {subjects.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Verb</label>
                  <select
                    value={rule.verb}
                    onChange={(e) =>
                      updateRule(rule.id, "verb", e.target.value)
                    }
                    className="w-full p-2 border rounded"
                  >
                    {verbs.map((verb) => (
                      <option key={verb} value={verb}>
                        {verb}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Predicate
                  </label>
                  <select
                    value={rule.predicate}
                    onChange={(e) =>
                      updateRule(rule.id, "predicate", e.target.value)
                    }
                    className="w-full p-2 border rounded"
                  >
                    {predicates.map((predicate) => (
                      <option key={predicate} value={predicate}>
                        {predicate}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Time Range
                  </label>
                  <select
                    value={rule.timeRange}
                    onChange={(e) =>
                      updateRule(rule.id, "timeRange", e.target.value)
                    }
                    className="w-full p-2 border rounded"
                  >
                    {timeRanges.map((timeRange) => (
                      <option key={timeRange} value={timeRange}>
                        {timeRange}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Weight: {rule.weight}%
                </label>
                <Slider
                  value={[rule.weight]}
                  onValueChange={(value) =>
                    updateRule(rule.id, "weight", value[0])
                  }
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          ))}
        </div>

        {rules.length > 0 && (
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSave}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Algorithm
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AlgorithmBuilder;
