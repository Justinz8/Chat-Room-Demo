
import { Chat, User } from "../../interfaces";
interface props{
  chatDetails: Chat,
  setCurrentChat: (ID: string) => void
}

export default function ChatCard(props: props) {
  return (
    <button
      className="ChatCard-Wrapper"
      onClick={() => {
        props.setCurrentChat(props.chatDetails.id);
      }}
    >
      <h1 className="ChatCard-Name">{props.chatDetails.name}</h1>
      <p className="ChatCard-Members">
        {props.chatDetails.members.map((x: User) => x.Username).toString()}
      </p>
    </button>
  );
}
