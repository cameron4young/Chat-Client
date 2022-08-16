export function $(selector, context = document) {
	return context.querySelector(selector);
}

export function $$(selector, context = document) {
	return Array.from(context.querySelectorAll(selector));
}

export function getFormData(form) {
	const data = new FormData(form);
	return Object.fromEntries(data.entries());
}

export function readableDate(date) {
	return new Date(date).toLocaleString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
	});
}