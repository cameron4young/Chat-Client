import { readableDate } from "./util.js";

export default {
	messageto: message =>`
	<article class="msg" id="${message.id}">
		<div class='name-right'>
			From ${message.sender} at ${readableDate(message.createdAt)}
		</div>
		<div class="msgright">
			<p class="txtright">${message.data.text}</p>
			<img class="dot" src="media/dots.png">
		</div>
	</article>`,

	messageAnimated: message =>`
	<article class="msg" id="${message.id}">
		<div class='name-right' id="recentMessage">
			From ${message.sender} at ${readableDate(message.createdAt)}
		</div>
		<div class="msgright" id="recentMessage">
			<p class="txtright">${message.data.text}</p>
			<img class="dot" src="media/dots.png">
		</div>
	</article>`,

	messagefrom: message =>`
	<article class="msg" id="${message.id}">
		<div class='name-left'>
			From ${message.sender} at ${readableDate(message.createdAt)}
		</div>
		<div class="msgleft">
			<p class="txtleft">${message.data.text}</p>
		</div>
	</article>`,
	imageto: message =>`
	<article class="msg" id="${message.id}">
		<div class='name-right'>
			From ${message.sender} at ${readableDate(message.createdAt)}
		</div>
		<div class="imgright">
			<img class="chat_img" src=${message.data}>
			<img class="dot" src="media/dots.png">
		</div>
	</article>
	`,
	imagefrom: message =>
	`
	<article class="msg" id="${message.id}">
		<div class='name-left'>
			From ${message.sender} at ${readableDate(message.createdAt)}
		</div>
		<div class="imgleft">
			<img class="chat_img" src=${message.data}>
		</div>
	</article>
	`
}