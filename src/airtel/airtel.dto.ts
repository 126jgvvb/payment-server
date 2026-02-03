export class AirtelCollectDto {
  phone: string;
  amount: number;
  reference: string;
  reSellerPhoneNumber?: string;
}

export class AirtelPayoutDto {
  phone: string;
  amount: number;
  reference: string;
}
