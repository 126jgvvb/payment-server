export class CreateWebhookLogDto {
  provider: string;
  payload: any;
  processed?: boolean;
}
