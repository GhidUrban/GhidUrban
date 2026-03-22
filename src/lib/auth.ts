import jwt from "jsonwebtoken";

export function generateToken() {
    return jwt.sign(
        { role: "admin" },
        process.env.JWT_SECRET as string,
        { expiresIn: "2h" }
    );
}

export function verifyToken(token: string) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET as string);
    } catch (error) {
        return null;
    }
}
