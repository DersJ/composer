import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Save, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FeedRule } from "./types";
import { useSaveAlgorithm } from "hooks/useSaveAlgorithm";
import { useFeeds } from "@/contexts/FeedsContext";
import { useNavigate } from "react-router-dom";
export interface AlgorithmBuilderProps {
  initialRules?: FeedRule[];
  initialName?: string;
}

const AlgorithmBuilder = ({
  initialRules = [],
  initialName = "",
}: AlgorithmBuilderProps) => {
  const saveAlgorithm = useSaveAlgorithm();
  const { loadFeeds } = useFeeds();
  const navigate = useNavigate();
  const [rules, setRules] = useState<FeedRule[]>(initialRules);
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string>("");

  // Update rules when initialRules changes
  useEffect(() => {
    if (initialRules && initialRules.length > 0) {
      setRules(initialRules);
      rebalanceWeights(initialRules);
    }
  }, [initialRules]);

  const subjects = [
    "Posts",
    "Replies",
    // "Pictures"
  ] as const;
  const verbs = [
    "posted",
    // "trending",
    // "commented",
    "liked",
    // "interacted",
  ] as const;
  const predicates = [
    "follows",
    // "nostr",
    // "tribe",
  ] as const;
  // const timeRanges = ["1hr", "4hr", "12hr", "24hr", "7d"] as const;

  const getPrepositionFromVerb = (verb: string) => {
    switch (verb) {
      case "liked":
        return "by";
      case "posted":
        return "by";
      case "commented":
        return "on";
      case "interacted":
        return "with";
    }
  };

  const addRule = () => {
    const newRule: FeedRule = {
      id: Date.now().toString(),
      subject: "Posts",
      verb: "posted",
      predicate: "follows",
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

  const updateRule = (id: string, field: keyof FeedRule, value: string | number) => {
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
    if (!name.trim()) {
      setError("Feed name is required");
      return false;
    }

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

  const resetForm = () => {
    setRules([]);
    setName("");
    setError("");
  };

  const handleSave = async () => {
    console.log("saving algorithm", { name, rules });
    if (validateRules()) {
      await saveAlgorithm(rules, name);
      await loadFeeds(); // Refresh the feeds list
      resetForm(); // Clear the form
      navigate("/"); // Navigate back to home
    }
  };

  const selectWidth = "w-1/5";

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

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Feed Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter feed name"
            className="w-full p-2 border rounded"
          />
        </div>

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

              <div className="flex gap-4 mb-4">
                <div className={selectWidth}>
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
                    {/* <option value="Pictures" disabled>
                      Pictures
                    </option> */}
                  </select>
                </div>

                <div className={selectWidth}>
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

                <div className="mt-8">{getPrepositionFromVerb(rule.verb)}</div>

                <div className={selectWidth}>
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
                        {predicate.charAt(0).toUpperCase() + predicate.slice(1)}
                      </option>
                    ))}
                    <option value="tribe" disabled>
                      Tribe (coming soon)
                    </option>
                    <option value="nostr" disabled>
                      Nostr (coming soon)
                    </option>
                    <option value="list" disabled>
                      List (coming soon)
                    </option>
                  </select>
                </div>

                {/* <div className={selectWidth}>
                  <label className="block text-sm font-medium mb-1">
                    Time Range (disabled)
                  </label>
                  <select
                    disabled
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
                </div> */}
              </div>

              {/* <div>
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
              </div> */}
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
