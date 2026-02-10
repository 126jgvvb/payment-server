export class AirtelCollectDto {
  phoneNumber: string;
  selectedPrice: number;
  reference?: string;
  reSellerPhoneNumber: string;
}

export class AirtelPayoutDto {
  phone: string;
  amount: number;
  reference: string;
}
