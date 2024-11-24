import { Bot } from "grammy";
import pino from "pino";
import "dotenv/config";

const TIMEPAD_BASE_URL = "https://api.timepad.ru/";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

const bot = process.env.TELEGRAM_BOT_API_KEY
  ? new Bot(process.env.TELEGRAM_BOT_API_KEY)
  : null;

async function fetchEventData(eventId, apiKey) {
  const response = await fetch(`${TIMEPAD_BASE_URL}v1/events/${eventId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    logger.error("Failed to fetch data");
    return;
  }

  return response.json();
}

function findRequiredTicketType(ticketTypes, ticketTypeId) {
  return ticketTypes.find((ticketType) => ticketType.id == ticketTypeId);
}

async function checkTicketAvailability(ticketType) {
  if (!ticketType) {
    logger.error("Failed to find ticket type from config");
    return;
  }

  if (!(ticketType.remaining && ticketType.is_active)) {
    logger.info("Tickets are sold out!");
    return;
  }

  logger.info(`${ticketType.remaining} ticket(s) are available!`);
  await bot?.api.sendMessage(
    process.env.TELEGRAM_USER_ID,
    `Hey, ${ticketType.remaining} ticket(s) are available!`
  );
}

async function makeRequest() {
  const eventId = process.env.TIMEPAD_EVENT_ID;
  const apiKey = process.env.TIMEPAD_API_KEY;
  const ticketTypeId = process.env.TIMEPAD_EVENT_TICKET_TYPE;

  const data = await fetchEventData(eventId, apiKey);
  if (!data) return;

  const requiredTicketType = findRequiredTicketType(
    data.ticket_types,
    ticketTypeId
  );
  checkTicketAvailability(requiredTicketType);
}

setInterval(makeRequest, process.env.DELAY || 5000);
