CREATE TABLE "MercadoPagoConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "clientId" TEXT,
    "clientSecretEncrypted" TEXT,
    "redirectUri" TEXT,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "webhookSecretEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MercadoPagoConfig_pkey" PRIMARY KEY ("id")
);
