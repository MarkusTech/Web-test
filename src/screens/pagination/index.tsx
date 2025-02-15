import Colors from "@/common/colors";
import Images from "@/common/images";
import TextInput from "@/components/TextInput";
import useCollectionObserver from "@/hooks/useCollectionObserver";
import useKeyListener from "@/hooks/useKeyListener";
import { useAuth } from "@/services/context/AuthContext";
import { googleSignIn } from "@/services/firebase/auth";
import { createDocument, createId } from "@/services/firebase/firestore";
import { MessageType } from "@/types";
import { sanitizeString } from "@/utils/functions";
import { TSDate } from "@/utils/variables";
import { useCallback, useEffect, useState } from "react";
import MessageRow from "./components/MessageRow";
import { orderBy, limit, startAfter } from "firebase/firestore";

const Pagination = () => {
  const { Auth, logout } = useAuth();
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);
  const [lastVisible, setLastVisible] = useState<MessageType | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const Messages = useCollectionObserver<MessageType>({
    Collection: "messages",
    Condition: [
      orderBy("createdAt", "desc"),
      ...(lastVisible ? [startAfter(lastVisible.createdAt)] : []),
      limit(20),
    ],
    ReplaceOld: false,
  });

  const sendMessage = useCallback(async () => {
    if (!Auth) return;
    const sanitized = sanitizeString(message);
    if (typeof message !== "string" || sanitized.trim() === "")
      return setMessageError(true);
    await createDocument<MessageType>({
      Collection: "messages",
      Data: {
        authorId: Auth.uid,
        createdAt: TSDate(),
        id: createId("messages"),
        message: sanitized,
      },
    });
    setMessage("");
  }, [message, Auth]);

  const handleSend = useCallback(async () => {
    if (!Auth)
      await googleSignIn().then((response) => {
        if (response.status !== 200) alert(response.message);
        else sendMessage();
      });
    else sendMessage();
  }, [Auth, sendMessage]);

  useKeyListener({
    key: "Enter",
    callback: handleSend,
    dependencies: [handleSend, Auth],
  });

  const handleScroll = (e: React.SyntheticEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;

    //  This help me fix with the error on scrolling and not rendering data. and i put setTimeout for 1 sec
    if (scrollTop <= 50 && !loading && hasMore) {
      setLoading(true);
      setTimeout(() => {
        if (Messages.length > 0) {
          const nextLastVisible = Messages[Messages.length - 1];
          setLastVisible(nextLastVisible);
          setLoading(false);
        }
      }, 1000);
    }
  };

  useEffect(() => {
    if (Messages.length > 0) {
      setLoading(false);
      if (Messages.length < 20) {
        setHasMore(false);
      }
    }
  }, [Messages]);

  return (
    <>
      <div
        style={{
          background: Colors.black500,
          top: `${innerHeight / 4}px`,
          left: `calc(50% - 200px)`,
        }}
        className="m-auto br-15px card text-center w-400px h-min-400px h-50vh absolute col gap-5px"
      >
        <div
          className="col-reverse gap-3px h-100p overflow-y-scroll visible-scrollbar"
          onScroll={handleScroll}
        >
          {Messages.map((msg) => (
            <MessageRow message={msg} key={msg.id} />
          ))}
        </div>
        <div className="row-center">
          <TextInput
            value={message}
            setValue={(e) => {
              setMessage(e.target.value);
              if (messageError) setMessageError(false);
            }}
            error={messageError}
            inputClassName="bootstrap-input"
            containerClassName="m-3px w-100p"
          />
          <button
            onClick={handleSend}
            className="h-30px w-30px"
            style={{ background: Colors.transparent }}
            type="button"
          >
            <img
              className="h-25px w-25px mr-3px"
              src={Images["ic_send_white"]}
            />
          </button>
        </div>
      </div>

      {Auth ? (
        <button
          style={{
            bottom: "100px",
            left: "calc(50% - 39px)",
            border: "1px solid " + Colors.white,
          }}
          onClick={logout}
          className="absolute br-3px pv-5px ph-15px"
          type="button"
        >
          Logout
        </button>
      ) : null}
    </>
  );
};

export default Pagination;
