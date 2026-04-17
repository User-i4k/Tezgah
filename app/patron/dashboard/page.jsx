"use client";
import { useEffect } from "react";

export default function PatronDashboardRoot() {
    useEffect(() => {
        // Eğer kullanıcı sadece '/patron/dashboard' bağlantısına girerse, orası boş bir klasör olduğu için
        // GÜVENLİK gereği otomatik olarak şube seçmesi için patron ana paneline atıyoruz.
        window.location.href = "/patron";
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <p className="text-gray-500">Güvenli alana yönlendiriliyorsunuz...</p>
        </div>
    );
}
