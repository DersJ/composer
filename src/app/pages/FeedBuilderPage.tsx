import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AlgorithmBuilder from "app/FeedBuilder";

export default function FeedBuilderPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Build Your Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <AlgorithmBuilder initialRules={[]} />
          <div className="mt-4">
            <Button variant="outline" onClick={() => navigate("/")}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
