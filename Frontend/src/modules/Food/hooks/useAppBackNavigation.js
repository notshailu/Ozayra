import { useCallback } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { isModuleAuthenticated } from "@food/utils/auth"

const normalizeStorefrontPath = (path) => {
  if (typeof path !== "string") return path
  const trimmed = path.trim()
  if (!trimmed) return trimmed

  const [pathPart, queryPart] = trimmed.split("?")
  const querySuffix = queryPart ? `?${queryPart}` : ""

  let clean = pathPart
  if (clean.startsWith("/food/user")) {
    clean = clean.slice(10) || "/"
  } else if (clean.startsWith("/user")) {
    clean = clean.slice(5) || "/"
  } else if (clean.startsWith("/food")) {
    if (clean.startsWith("/food/restaurant") || clean.startsWith("/food/delivery")) {
      return trimmed
    }
    clean = clean.slice(5) || "/"
  }

  if (clean === "/" || clean === "") return `/quick${querySuffix}`
  if (clean.startsWith("/profile")) {
    return `${clean}${querySuffix}`
  }
  if (clean.startsWith("/cart")) {
    return `${clean}${querySuffix}`
  }
  if (clean.startsWith("/orders")) {
    const suffix = clean.slice(7)
    return `/quick/orders${suffix}${querySuffix}`
  }
  if (clean.startsWith("/wallet")) {
    return `/quick/wallet${querySuffix}`
  }
  if (clean.startsWith("/addresses")) {
    return `/quick/addresses${querySuffix}`
  }
  if (clean.startsWith("/support")) {
    return `/quick/support${querySuffix}`
  }
  if (clean.startsWith("/wishlist")) {
    return `/quick/wishlist${querySuffix}`
  }
  if (clean.startsWith("/transactions")) {
    return `/quick/transactions${querySuffix}`
  }
  if (clean.startsWith("/privacy")) {
    return `/quick/privacy${querySuffix}`
  }
  if (clean.startsWith("/about")) {
    return `/quick/about${querySuffix}`
  }
  if (clean.startsWith("/terms")) {
    return `/quick/terms${querySuffix}`
  }
  if (clean.startsWith("/categories")) {
    return `/quick/categories${clean.slice(11)}${querySuffix}`
  }
  if (clean.startsWith("/category/")) {
    return `/quick/categories/${clean.slice(10)}${querySuffix}`
  }
  if (clean.startsWith("/product/")) {
    return `/quick/product/${clean.slice(9)}${querySuffix}`
  }
  if (clean.startsWith("/products")) {
    return `/quick/products${querySuffix}`
  }
  if (clean.startsWith("/search")) {
    return `/quick/search${querySuffix}`
  }

  return `/quick${querySuffix}`
}

const toFoodPath = (value) => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed
}

const getNormalizedUserPath = (pathname) => {
  if (pathname.startsWith("/cart")) {
    return pathname
  }
  if (pathname.startsWith("/food")) {
    return pathname.slice(5) || "/"
  }
  return pathname || "/"
}

const resolveBackPath = ({ pathname, search, state }) => {
  const normalizedPath = getNormalizedUserPath(pathname)
  const explicitBackPath = toFoodPath(state?.backTo) || toFoodPath(state?.from)
  const searchParams = new URLSearchParams(search || "")

  if (
    normalizedPath === "/user/profile/payments/new" ||
    /^\/user\/profile\/payments\/[^/]+\/edit$/.test(normalizedPath)
  ) {
    return "/food/user/profile/payments"
  }

  if (
    /^\/user\/profile\/(edit|favorites|support|coupons|about|report-safety-emergency|accessibility|logout|refer-earn|payments)$/.test(
      normalizedPath,
    )
  ) {
    return "/food/user/profile"
  }

  if (
    /^\/user\/profile\/(terms|privacy|refund|shipping|cancellation)$/.test(
      normalizedPath,
    )
  ) {
    if (!isModuleAuthenticated("user")) {
      return "/user/auth/login"
    }
    return explicitBackPath || "/food/user/profile"
  }

  if (normalizedPath === "/user/wallet") {
    if (pathname.startsWith('/quick') || searchParams.get('from') === 'quick') {
      return "/profile?from=quick"
    }
    return "/food/user/profile"
  }

  if (pathname.startsWith('/quick') || searchParams.get('from') === 'quick') {
    return "/profile?from=quick"
  }

  if (normalizedPath === "/user/notifications") {
    return explicitBackPath || "/food/user"
  }

  if (/^\/user\/restaurants\/[^/]+$/.test(normalizedPath)) {
    if (searchParams.get("under250") === "true") {
      return "/food/user/under-250"
    }
    return explicitBackPath || "/food/user"
  }

  if (/^\/user\/dining\/book(\/|$)/.test(normalizedPath)) {
    return explicitBackPath || "/food/user/dining"
  }

  if (/^\/user\/dining\/[^/]+\/[^/]+$/.test(normalizedPath)) {
    return explicitBackPath || "/food/user/dining"
  }

  if (
    normalizedPath === "/user/dining/restaurants" ||
    normalizedPath === "/user/dining/explore/upto50" ||
    normalizedPath === "/user/dining/explore/near-rated" ||
    normalizedPath === "/user/dining/coffee"
  ) {
    return "/food/user/dining"
  }

  if (/^\/user\/dining\/[^/]+$/.test(normalizedPath)) {
    return "/food/user/dining"
  }

  if (/^\/user\/orders\/[^/]+(\/invoice|\/details)?$/.test(normalizedPath)) {
    return "/food/user/orders"
  }

  if (
    normalizedPath === "/cart/checkout" ||
    normalizedPath === "/cart/select-address" ||
    normalizedPath === "/cart/address-selector" ||
    normalizedPath === "/user/cart/checkout" ||
    normalizedPath === "/user/cart/select-address" ||
    normalizedPath === "/user/cart/address-selector"
  ) {
    return "/cart"
  }

  if (normalizedPath === "/user/address-selector") {
    return explicitBackPath || "/food/user"
  }

  if (/^\/user\/collections\/[^/]+$/.test(normalizedPath)) {
    return "/food/user/collections"
  }

  if (normalizedPath === "/user/categories") {
    return "/food/user"
  }

  if (/^\/user\/category\/[^/]+$/.test(normalizedPath)) {
    return "/food/user/categories"
  }

  if (
    normalizedPath === "/user/offers" ||
    normalizedPath === "/user/gourmet" ||
    normalizedPath === "/user/coffee"
  ) {
    return "/food/user"
  }

  if (/^\/user\/product\/[^/]+$/.test(normalizedPath)) {
    return explicitBackPath || "/food/user"
  }

  if (/^\/user\/complaints(\/|$)/.test(normalizedPath)) {
    return explicitBackPath || "/food/user/orders"
  }

  if (explicitBackPath && explicitBackPath !== pathname) {
    return explicitBackPath
  }

  return "/food/user"
}

export default function useAppBackNavigation() {
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback(() => {
    navigate(normalizeStorefrontPath(resolveBackPath(location)))
  }, [location, navigate])
}
