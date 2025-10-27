import moment from "moment";
import { customAlphabet } from "nanoid";
import bcrypt from "bcryptjs";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
moment.locale("id");

export function randomString(): string {
    const nanoid = customAlphabet(alphabet, 10);
	const datePart = moment().format("YYYYMMDD");
	const randomPart = nanoid();
	return `${datePart}-${randomPart}`;
}

export function encryptPassword(password: string): string {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
}

export function comparePassword(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
}

