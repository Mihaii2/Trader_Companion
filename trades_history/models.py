from django.db import models

class Trades(models.Model):
    ID = models.IntegerField(primary_key=True)
    Ticker = models.CharField(max_length=10)
    Status = models.CharField(max_length=50)
    Entry_Date = models.DateField()
    Exit_Date = models.DateField(null=True, blank=True)
    Entry_Price = models.FloatField()
    Exit_Price = models.FloatField(null=True, blank=True)
    Return = models.FloatField(null=True, blank=True, default=0)
    Pattern = models.CharField(max_length=100)
    Days_In_Pattern_Before_Entry = models.IntegerField()
    Price_Tightness_1_Week_Before = models.FloatField()
    Exit_Reason = models.CharField(max_length=1000)
    Market_Condition = models.CharField(max_length=100)
    Category = models.CharField(max_length=100)
    Case = models.TextField(blank=True, default='')
    Earnings_Quality = models.IntegerField()
    Fundamentals_Quality = models.IntegerField()
    Has_Earnings_Acceleration = models.BooleanField()
    Has_Catalyst = models.BooleanField()
    Earnings_Last_Q_20_Pct = models.BooleanField()
    IPO_Last_10_Years = models.BooleanField()
    Nr_Bases = models.IntegerField()
    Volume_Confirmation = models.BooleanField()
    Is_BioTech = models.BooleanField()
    Earnings_Surprises = models.BooleanField()
    Expanding_Margins = models.BooleanField()
    EPS_breakout = models.BooleanField()
    Strong_annual_EPS = models.BooleanField()
    Signs_Acceleration_Will_Continue = models.BooleanField()
    Sudden_Growth_Change = models.BooleanField()
    Strong_Quarterly_Sales = models.BooleanField()
    Strong_Yearly_Sales = models.BooleanField(default=False)
    Positive_Analysts_EPS_Revisions = models.BooleanField()
    Positive_Analysts_Price_Revisions = models.BooleanField(default=False)
    Ownership_Pct_Change_Past_Earnings = models.BooleanField()
    Quarters_With_75pct_Surprise = models.BooleanField()
    Over_10_pct_Avg_Surprise = models.BooleanField()
    Under_30k_Shares = models.BooleanField(default=False)
    Spikes_On_Volume = models.BooleanField(default=False)
    Started_Off_Correction = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.Ticker} - {self.Entry_Date}"

class Balance(models.Model):
    balance = models.FloatField(default=1000.0)

    def __str__(self):
        return f"Current Balance: ${self.balance}"