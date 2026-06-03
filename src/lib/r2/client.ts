import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type R2Config = {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    publicUrl: string;
};

function envOrThrow(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Missing required env: ${name}`);
    }
    return value;
}

export function getR2Config(): R2Config {
    return {
        accountId: envOrThrow("R2_ACCOUNT_ID"),
        accessKeyId: envOrThrow("R2_ACCESS_KEY_ID"),
        secretAccessKey: envOrThrow("R2_SECRET_ACCESS_KEY"),
        bucketName: envOrThrow("R2_BUCKET_NAME"),
        publicUrl: envOrThrow("R2_PUBLIC_URL").replace(/\/+$/, ""),
    };
}

export function createR2Client(config: R2Config): S3Client {
    return new S3Client({
        region: "auto",
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
    });
}

export function buildPublicUrl(publicBase: string, objectKey: string): string {
    const base = publicBase.replace(/\/+$/, "");
    const key = objectKey.replace(/^\/+/, "");
    return `${base}/${key}`;
}

type UploadToR2Input = {
    client: S3Client;
    config: R2Config;
    key: string;
    body: Buffer;
    contentType: string;
};

export async function uploadToR2(input: UploadToR2Input): Promise<void> {
    await input.client.send(
        new PutObjectCommand({
            Bucket: input.config.bucketName,
            Key: input.key,
            Body: input.body,
            ContentType: input.contentType,
            CacheControl: "public, max-age=31536000, immutable",
        }),
    );
}
