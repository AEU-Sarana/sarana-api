CREATE TABLE "package_features" (
    "id" SERIAL NOT NULL,
    "package_id" INTEGER NOT NULL,
    "feature_code" VARCHAR(100) NOT NULL,
    "feature_value" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_features_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "package_features_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "package_features_package_id_idx" ON "package_features"("package_id");
