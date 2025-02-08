import { useEffect, useState } from "react";
import { firestore } from "@/services/firebase/config";
import {
  query,
  onSnapshot,
  collection,
  QueryConstraint,
} from "firebase/firestore";
import { convertTimestampsToDate, removeDuplicates } from "@/utils/functions";

type Props<T> = {
  Collection: string;
  Condition?: QueryConstraint[];
  Dependencies?: Array<any>;
  Run?: boolean;
  ReplaceOld?: boolean;
};

function useCollectionObserver<T>({
  Collection,
  Condition,
  Dependencies = [],
  Run = true,
  ReplaceOld = false,
}: Props<T>): (T & { docId: string })[] {
  const [firestoreCollection, setFirestoreCollection] = useState<
    Array<T & { docId: string }>
  >([]);

  useEffect(() => {
    if (Run === false)
      return setFirestoreCollection((prev) => (ReplaceOld ? [] : prev));

    console.info("Rerendering useCollectionObserver...");
    const q = Condition
      ? query(collection(firestore, Collection), ...Condition)
      : query(collection(firestore, Collection));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data: Array<T & { docId: string }> = [];
      querySnapshot.forEach((doc) => {
        data.push(
          convertTimestampsToDate({ ...doc.data(), docId: doc.id }) as T & {
            docId: string;
          }
        );
      });

      setFirestoreCollection((prev) =>
        ReplaceOld ? data : removeDuplicates([...prev, ...data], "docId")
      );
    });

    // Cleanup on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [Collection, Condition, Dependencies, Run, ReplaceOld]);

  return firestoreCollection;
}

export default useCollectionObserver;
