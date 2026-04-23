import { useCallback, useState } from "react";

import type { MarkerGroupSpot, PendingSpot, ReviewForm, Spot } from "@/features/map/types";

type UseSpotSubmissionParams = {
  apiUrl: string;
  persistSpotLocally: (spot: Spot) => Promise<void>;
  setSyncStatus: (value: string) => void;
};

export function useSpotSubmission({
  apiUrl,
  persistSpotLocally,
  setSyncStatus,
}: UseSpotSubmissionParams) {
  const [reviewForm, setReviewForm] = useState<ReviewForm>({ rating: "", comment: "" });
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [newSpotForm, setNewSpotForm] = useState<ReviewForm>({ rating: "", comment: "" });
  const [newSpotError, setNewSpotError] = useState<string | null>(null);
  const [submittingNewSpot, setSubmittingNewSpot] = useState(false);

  const resetNewSpotForm = useCallback(() => {
    setNewSpotForm({ rating: "", comment: "" });
    setNewSpotError(null);
    setSubmittingNewSpot(false);
  }, []);

  const resetReviewForm = useCallback(() => {
    setReviewForm({ rating: "", comment: "" });
    setReviewError(null);
    setSubmittingReview(false);
  }, []);

  const submitSpot = useCallback(async (
    payload: { lat: number; lon: number; rating: number; comment: string; country: string | null },
    onSuccess: () => void,
    onError: (message: string) => void,
    setLoading: (value: boolean) => void,
  ) => {
    setLoading(true);
    onError("");

    try {
      const response = await fetch(`${apiUrl}/spots/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as Spot | { error?: string };
      const errorMessage =
        typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
          ? data.error
          : "Nie udało się zapisać.";

      if (!response.ok || !("id" in data)) {
        throw new Error(errorMessage);
      }

      await persistSpotLocally(data);
      setSyncStatus("Nowy wpis zapisany i dodany do lokalnej bazy.");
      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Nie udało się zapisać.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, persistSpotLocally, setSyncStatus]);

  const submitNewSpot = useCallback((
    pendingSpot: PendingSpot | null,
    pendingCountry: string | null,
    onSuccess: () => void,
  ) => {
    if (!pendingSpot) {
      setNewSpotError("Najpierw ustaw pinezkę.");
      return;
    }

    const rating = Number(newSpotForm.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      setNewSpotError("Wybierz ocenę od 1 do 5.");
      return;
    }

    void submitSpot(
      {
        lat: pendingSpot.latitude,
        lon: pendingSpot.longitude,
        rating,
        comment: newSpotForm.comment,
        country: pendingCountry,
      },
      onSuccess,
      setNewSpotError,
      setSubmittingNewSpot,
    );
  }, [newSpotForm.comment, newSpotForm.rating, submitSpot]);

  const submitReview = useCallback((
    selectedMarker: MarkerGroupSpot | null,
    onSuccess: () => void,
  ) => {
    if (!selectedMarker) return;

    const rating = Number(reviewForm.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      setReviewError("Wybierz ocenę od 1 do 5.");
      return;
    }

    void submitSpot(
      {
        lat: selectedMarker.latitude,
        lon: selectedMarker.longitude,
        rating,
        comment: reviewForm.comment,
        country: selectedMarker.primarySpot.country,
      },
      onSuccess,
      setReviewError,
      setSubmittingReview,
    );
  }, [reviewForm.comment, reviewForm.rating, submitSpot]);

  return {
    reviewForm,
    setReviewForm,
    reviewError,
    submittingReview,
    newSpotForm,
    setNewSpotForm,
    newSpotError,
    submittingNewSpot,
    resetNewSpotForm,
    resetReviewForm,
    submitNewSpot,
    submitReview,
  };
}
